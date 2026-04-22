import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type MeetingQuestionRow = Tables<'meeting_questions'>;

// ────────────────────────────────────────────────────────────────
// Query
// ────────────────────────────────────────────────────────────────

export function useMeetingQuestions(contactId: string) {
  return useQuery({
    queryKey: ['meeting-questions', contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<MeetingQuestionRow[]> => {
      const { data, error } = await supabase
        .from('meeting_questions')
        .select('*')
        .eq('deal_team_contact_id', contactId)
        .order('last_asked_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ────────────────────────────────────────────────────────────────
// Shared auth helper
// ────────────────────────────────────────────────────────────────

function useAuthIds() {
  const { user, director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const authUserId = user?.id;       // RLS check (created_by)
  const directorId = director?.id;   // audit fields (last_asked_by, answered_by)
  return { tenantId, authUserId, directorId };
}

// ────────────────────────────────────────────────────────────────
// Input types
// ────────────────────────────────────────────────────────────────

type CreateQuestionInput = { contactId: string; questionText: string };
type AskAgainInput = { questionId: string; contactId: string };
type AnswerInput = { questionId: string; contactId: string; answerText: string };
type SkipInput = { questionId: string; contactId: string };
type DropInput = { questionId: string; contactId: string };

// ────────────────────────────────────────────────────────────────
// 1. Create
// ────────────────────────────────────────────────────────────────

export function useCreateMeetingQuestion() {
  const queryClient = useQueryClient();
  const { tenantId, authUserId, directorId } = useAuthIds();

  return useMutation({
    mutationFn: async (input: CreateQuestionInput) => {
      if (!authUserId) throw new Error('Brak zalogowanego użytkownika');
      if (!directorId) throw new Error('Brak powiązanego dyrektora');
      if (!tenantId) throw new Error('Brak tenant_id');

      const questionText = input.questionText.trim();
      if (!questionText) throw new Error('Treść pytania wymagana');

      const { data: dtc, error: fetchErr } = await supabase
        .from('deal_team_contacts')
        .select('tenant_id, team_id')
        .eq('id', input.contactId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!dtc) throw new Error('Kontakt nie znaleziony');

      const { data: inserted, error: insErr } = await supabase
        .from('meeting_questions')
        .insert({
          tenant_id: dtc.tenant_id,
          team_id: dtc.team_id,
          deal_team_contact_id: input.contactId,
          question_text: questionText,
          last_asked_at: new Date().toISOString(),
          last_asked_by: directorId,
          created_by: authUserId,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;

      return { questionId: inserted.id, contactId: input.contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-questions', result.contactId] });
      toast.success('Pytanie dodane');
    },
    onError: (error: Error) => toast.error(`Błąd: ${error.message}`),
  });
}

// ────────────────────────────────────────────────────────────────
// 2. Ask again
// ────────────────────────────────────────────────────────────────

export function useAskMeetingQuestionAgain() {
  const queryClient = useQueryClient();
  const { directorId } = useAuthIds();

  return useMutation({
    mutationFn: async (input: AskAgainInput) => {
      if (!directorId) throw new Error('Brak powiązanego dyrektora');

      const { data: row, error: fetchErr } = await supabase
        .from('meeting_questions')
        .select('ask_count, status')
        .eq('id', input.questionId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!row) throw new Error('Pytanie nie znalezione');
      if (row.status !== 'open') {
        throw new Error(`Pytanie w stanie ${row.status} nie może być zadane ponownie`);
      }

      const { error: updErr } = await supabase
        .from('meeting_questions')
        .update({
          ask_count: row.ask_count + 1,
          last_asked_at: new Date().toISOString(),
          last_asked_by: directorId,
        })
        .eq('id', input.questionId);
      if (updErr) throw updErr;

      return { questionId: input.questionId, contactId: input.contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-questions', result.contactId] });
      toast.success('Pytanie zadane ponownie');
    },
    onError: (error: Error) => toast.error(`Błąd: ${error.message}`),
  });
}

// ────────────────────────────────────────────────────────────────
// 3. Answer
// ────────────────────────────────────────────────────────────────

export function useAnswerMeetingQuestion() {
  const queryClient = useQueryClient();
  const { directorId } = useAuthIds();

  return useMutation({
    mutationFn: async (input: AnswerInput) => {
      if (!directorId) throw new Error('Brak powiązanego dyrektora');

      const answerText = input.answerText.trim();
      if (!answerText) throw new Error('Treść odpowiedzi wymagana');

      const { data: row, error: fetchErr } = await supabase
        .from('meeting_questions')
        .select('status')
        .eq('id', input.questionId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!row) throw new Error('Pytanie nie znalezione');
      if (row.status !== 'open') {
        throw new Error(`Pytanie w stanie ${row.status} nie może być odpowiedziane`);
      }

      const { error: updErr } = await supabase
        .from('meeting_questions')
        .update({
          status: 'answered',
          answered_at: new Date().toISOString(),
          answered_by: directorId,
          answer_text: answerText,
        })
        .eq('id', input.questionId);
      if (updErr) throw updErr;

      return { questionId: input.questionId, contactId: input.contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-questions', result.contactId] });
      toast.success('Odpowiedź zapisana');
    },
    onError: (error: Error) => toast.error(`Błąd: ${error.message}`),
  });
}

// ────────────────────────────────────────────────────────────────
// 4. Skip
// ────────────────────────────────────────────────────────────────

export function useSkipMeetingQuestion() {
  const queryClient = useQueryClient();
  const { directorId } = useAuthIds();

  return useMutation({
    mutationFn: async (input: SkipInput) => {
      if (!directorId) throw new Error('Brak powiązanego dyrektora');

      const { data: row, error: fetchErr } = await supabase
        .from('meeting_questions')
        .select('ask_count, status')
        .eq('id', input.questionId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!row) throw new Error('Pytanie nie znalezione');
      if (row.status !== 'open') {
        throw new Error(`Pytanie w stanie ${row.status} nie może być pominięte`);
      }

      const { error: updErr } = await supabase
        .from('meeting_questions')
        .update({
          status: 'skipped',
          ask_count: row.ask_count + 1,
        })
        .eq('id', input.questionId);
      if (updErr) throw updErr;

      return { questionId: input.questionId, contactId: input.contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-questions', result.contactId] });
      toast.success('Pytanie pominięte');
    },
    onError: (error: Error) => toast.error(`Błąd: ${error.message}`),
  });
}

// ────────────────────────────────────────────────────────────────
// 5. Drop
// ────────────────────────────────────────────────────────────────

export function useDropMeetingQuestion() {
  const queryClient = useQueryClient();
  const { directorId } = useAuthIds();

  return useMutation({
    mutationFn: async (input: DropInput) => {
      if (!directorId) throw new Error('Brak powiązanego dyrektora');

      const { data: row, error: fetchErr } = await supabase
        .from('meeting_questions')
        .select('status')
        .eq('id', input.questionId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!row) throw new Error('Pytanie nie znalezione');
      if (row.status === 'answered' || row.status === 'dropped') {
        throw new Error(`Pytanie w stanie ${row.status} nie może być porzucone`);
      }

      const { error: updErr } = await supabase
        .from('meeting_questions')
        .update({ status: 'dropped' })
        .eq('id', input.questionId);
      if (updErr) throw updErr;

      return { questionId: input.questionId, contactId: input.contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-questions', result.contactId] });
      toast.success('Pytanie porzucone');
    },
    onError: (error: Error) => toast.error(`Błąd: ${error.message}`),
  });
}