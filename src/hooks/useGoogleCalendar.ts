import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { GCalEvent, GCalCalendar } from '@/types/calendar';

// ─── Connection status ──────────────────────────────────────────────
export function useGCalConnection() {
  const { director } = useAuth();
  const directorId = director?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['gcal-connection', directorId],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('gcal_tokens')
        .select('connected_email, selected_calendars')
        .eq('director_id', directorId!)
        .maybeSingle();

      if (error) throw error;

      return {
        isConnected: !!row,
        connectedEmail: (row?.connected_email as string) ?? null,
        selectedCalendars: (row?.selected_calendars as string[]) ?? [],
      };
    },
    enabled: !!directorId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isConnected: data?.isConnected ?? false,
    connectedEmail: data?.connectedEmail ?? null,
    selectedCalendars: data?.selectedCalendars ?? [],
    isLoading,
  };
}

// ─── Start OAuth ────────────────────────────────────────────────────
export function useGCalConnect() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gcal-auth', {
        body: { action: 'get-auth-url' },
      });

      if (error) throw error;
      if (!data?.auth_url) throw new Error('Nie otrzymano URL autoryzacji');

      return data.auth_url as string;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: (err: Error) => {
      toast.error(`Błąd połączenia: ${err.message}`);
    },
  });
}

// ─── Disconnect ─────────────────────────────────────────────────────
export function useGCalDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gcal-auth', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gcal-connection'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-calendars'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-events'] });
      toast.success('Rozłączono Google Calendar');
    },
    onError: (err: Error) => {
      toast.error(`Błąd rozłączania: ${err.message}`);
    },
  });
}

// ─── List user's calendars ──────────────────────────────────────────
export function useGCalCalendars(enabled: boolean) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['gcal-calendars', director?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('gcal-events', {
        body: { action: 'list-calendars' },
      });

      if (error) throw error;
      if (data?.error === 'not_connected') return [];

      return (data?.calendars ?? []) as GCalCalendar[];
    },
    enabled: !!director?.id && enabled,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Update selected calendars ──────────────────────────────────────
export function useUpdateSelectedCalendars() {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarIds: string[]) => {
      if (!director?.id) throw new Error('Brak dyrektora');

      const { error } = await supabase
        .from('gcal_tokens')
        .update({ selected_calendars: calendarIds })
        .eq('director_id', director.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gcal-connection'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-events'] });
      toast.success('Kalendarze zaktualizowane');
    },
    onError: (err: Error) => {
      toast.error(`Błąd zapisu: ${err.message}`);
    },
  });
}

// ─── Fetch events ───────────────────────────────────────────────────
export function useGCalEvents(timeMin: string, timeMax: string, enabled: boolean) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['gcal-events', director?.id, timeMin, timeMax],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('gcal-events', {
        body: { action: 'get-events', time_min: timeMin, time_max: timeMax },
      });

      if (error) throw error;
      if (data?.error === 'not_connected') return [];

      return (data?.events ?? []) as GCalEvent[];
    },
    enabled: !!director?.id && enabled && !!timeMin && !!timeMax,
    staleTime: 5 * 60 * 1000,
  });
}
