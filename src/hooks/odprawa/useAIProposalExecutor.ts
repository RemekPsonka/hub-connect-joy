// ODPRAWA-03 Faza D2 — useAIProposalExecutor
// Wykonuje propozycje write z live-copilot po user confirm.
// Audit: user_confirm / user_reject do ai_audit_log.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLogDecision, type DecisionVerdict } from "@/hooks/useLogDecision";
import { toast } from "sonner";
import type { AIProposal } from "@/hooks/odprawa/useAILiveContext";
import type { Json } from "@/integrations/supabase/types";

interface ExecuteArgs {
  proposal: AIProposal;
  contactId: string; // contacts.id
  dealTeamContactId: string; // deal_team_contacts.id
  teamId: string;
  tenantId: string;
  sessionId: string;
}

async function logAudit(args: {
  tenantId: string;
  teamId: string;
  sessionId: string;
  userId: string;
  eventType: "user_confirm" | "user_reject";
  proposal: AIProposal;
  result?: unknown;
  errorMessage?: string;
}) {
  const row = {
    tenant_id: args.tenantId,
    team_id: args.teamId,
    odprawa_session_id: args.sessionId,
    user_id: args.userId,
    event_type: args.eventType,
    tool_name: args.proposal.tool,
    input: args.proposal.args as unknown as Json,
    output: ({
      proposal_id: args.proposal.proposal_id ?? null,
      ...(args.errorMessage
        ? { error: args.errorMessage }
        : (typeof args.result === "object" && args.result !== null
            ? args.result
            : { result: args.result ?? true })),
    }) as unknown as Json,
    confirmed: args.eventType === "user_confirm" ? !args.errorMessage : false,
  };
  await supabase.from("ai_audit_log").insert(row);
}

export function useAIProposalExecutor() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const logDecision = useLogDecision();

  const reject = useMutation({
    mutationFn: async (args: ExecuteArgs) => {
      if (!user?.id) throw new Error("Brak zalogowanego użytkownika");
      await logAudit({
        tenantId: args.tenantId,
        teamId: args.teamId,
        sessionId: args.sessionId,
        userId: user.id,
        eventType: "user_reject",
        proposal: args.proposal,
      });
    },
  });

  const execute = useMutation({
    mutationFn: async (args: ExecuteArgs) => {
      if (!user?.id) throw new Error("Brak zalogowanego użytkownika");
      const { proposal, contactId, dealTeamContactId, teamId, tenantId, sessionId } = args;

      let result: unknown = { ok: true };

      switch (proposal.tool) {
        case "create_task": {
          const title = String(proposal.args.title ?? "").trim();
          if (!title) throw new Error("Brak tytułu zadania");
          const dueDate = proposal.args.due_date ?? null;
          const description = proposal.args.description ?? null;

          // Resolve owner (director_id)
          const { data: directorRow, error: dirErr } = await supabase
            .from("directors")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          if (dirErr) throw dirErr;
          if (!directorRow?.id)
            throw new Error("Nie znaleziono powiązanego dyrektora");
          const ownerDirectorId = directorRow.id;

          const { data: task, error: taskErr } = await supabase
            .from("tasks")
            .insert({
              tenant_id: tenantId,
              title,
              description,
              status: "open",
              assigned_to: ownerDirectorId,
              owner_id: ownerDirectorId,
              due_date: dueDate,
              deal_team_id: teamId,
              deal_team_contact_id: dealTeamContactId,
            })
            .select("id")
            .single();
          if (taskErr) throw taskErr;

          await supabase.from("task_contacts").insert({
            task_id: task.id,
            contact_id: contactId,
            role: "primary",
          });

          result = { task_id: task.id };
          qc.invalidateQueries({ queryKey: ["odprawa-contact-tasks", contactId] });
          qc.invalidateQueries({ queryKey: ["tasks"] });
          break;
        }

        case "update_contact_stage": {
          const allowed = ["prospect", "lead", "client", "deferred", "lost"];
          const cat = String(proposal.args.category ?? "");
          if (!allowed.includes(cat)) throw new Error(`Niedozwolony etap: ${cat}`);
          const { error } = await supabase
            .from("deal_team_contacts")
            .update({ category: cat })
            .eq("id", dealTeamContactId);
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ["deal_team_contact_for_agenda"] });
          qc.invalidateQueries({ queryKey: ["odprawa-agenda"] });
          break;
        }

        case "update_contact_temperature": {
          const allowed = ["cold", "warm", "hot", "10x", null];
          const temp =
            proposal.args.temperature === null
              ? null
              : String(proposal.args.temperature ?? "");
          if (!allowed.includes(temp))
            throw new Error(`Niedozwolona temperatura: ${temp}`);
          const { error } = await supabase
            .from("deal_team_contacts")
            .update({ temperature: temp })
            .eq("id", dealTeamContactId);
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ["deal_team_contact_for_agenda"] });
          qc.invalidateQueries({ queryKey: ["odprawa-agenda"] });
          break;
        }

        case "log_decision": {
          const allowed: DecisionVerdict[] = ["push", "pivot", "park", "kill"];
          const dec = proposal.args.decision as DecisionVerdict;
          if (!allowed.includes(dec)) throw new Error(`Niedozwolona decyzja: ${dec}`);
          await logDecision.mutateAsync({
            contactId: dealTeamContactId,
            teamId,
            tenantId,
            decision: dec,
            milestoneVariant: null,
            odprawaSessionId: sessionId,
            notes: proposal.args.notes ?? null,
          });
          break;
        }

        default:
          throw new Error(`Nieznane narzędzie: ${(proposal as AIProposal).tool}`);
      }

      await logAudit({
        tenantId,
        teamId,
        sessionId,
        userId: user.id,
        eventType: "user_confirm",
        proposal,
        result,
      });

      return result;
    },
    onSuccess: () => {
      toast.success("Propozycja AI wykonana");
    },
    onError: async (e: Error, variables) => {
      // Audit failure as user_confirm with error.
      if (user?.id) {
        await logAudit({
          tenantId: variables.tenantId,
          teamId: variables.teamId,
          sessionId: variables.sessionId,
          userId: user.id,
          eventType: "user_confirm",
          proposal: variables.proposal,
          errorMessage: e.message,
        });
      }
      toast.error(`Nie udało się wykonać: ${e.message}`);
    },
  });

  return { execute, reject };
}
