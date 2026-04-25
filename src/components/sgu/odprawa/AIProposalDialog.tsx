// ODPRAWA-03 Faza D2 — AIProposalDialog
// AlertDialog confirm dla propozycji write z live-copilot.
// Brak auto-execute — user musi kliknąć "Wykonaj" lub "Odrzuć".
// Audit: user_confirm / user_reject do ai_audit_log.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Loader2 } from "lucide-react";
import type { AIProposal } from "@/hooks/odprawa/useAILiveContext";

interface Props {
  proposal: AIProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onReject: () => void;
  isExecuting: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  create_task: "Utworzyć zadanie",
  update_contact_stage: "Zmienić etap kontaktu",
  update_contact_temperature: "Zmienić temperaturę kontaktu",
  log_decision: "Zalogować decyzję",
};

function describeArgs(p: AIProposal): string {
  switch (p.tool) {
    case "create_task":
      return `Tytuł: „${p.args.title ?? "—"}"${
        p.args.due_date ? ` · Termin: ${p.args.due_date}` : ""
      }`;
    case "update_contact_stage":
      return `Nowy etap: ${p.args.category ?? "—"}`;
    case "update_contact_temperature":
      return `Nowa temperatura: ${p.args.temperature ?? "—"}`;
    case "log_decision":
      return `Decyzja: ${p.args.decision ?? "—"}${
        p.args.notes ? ` · ${p.args.notes}` : ""
      }`;
    default:
      return JSON.stringify(p.args);
  }
}

export function AIProposalDialog({
  proposal,
  open,
  onOpenChange,
  onConfirm,
  onReject,
  isExecuting,
}: Props) {
  if (!proposal) return null;
  const label = TOOL_LABELS[proposal.tool] ?? proposal.tool;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isExecuting) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Propozycja AI: {label}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block text-sm">{describeArgs(proposal)}</span>
            {proposal.rationale && (
              <span className="block text-xs italic text-muted-foreground">
                {proposal.rationale}
              </span>
            )}
            <span className="block text-xs text-muted-foreground pt-1">
              Akcja zostanie wykonana dopiero po Twoim potwierdzeniu.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isExecuting}
            onClick={(e) => {
              e.preventDefault();
              onReject();
            }}
          >
            Odrzuć
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isExecuting}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wykonywanie…
              </>
            ) : (
              "Wykonaj"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
