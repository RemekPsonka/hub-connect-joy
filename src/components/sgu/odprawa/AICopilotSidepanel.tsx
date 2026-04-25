// ODPRAWA-03 Faza D1 — AICopilotSidepanel
// Read-only AI panel z 3 sekcjami (Kontekst / Sugerowana akcja / Pytania wspierające).
// Brak buttonów write — D2 wprowadzi tool calling z AlertDialog confirm.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Lightbulb,
  MessageCircleQuestion,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAILiveContext } from "@/hooks/odprawa/useAILiveContext";
import { useAIProposalExecutor } from "@/hooks/odprawa/useAIProposalExecutor";
import { AIProposalDialog } from "./AIProposalDialog";

interface Props {
  sessionId: string | null;
  contactId: string | null;
  dealTeamContactId: string | null;
  teamId?: string | null;
  tenantId?: string | null;
}

function renderMarkdownBlock(text: string): JSX.Element {
  if (!text) return <></>;
  const lines = text.split("\n").map((l) => l.trimEnd());
  const elements: JSX.Element[] = [];
  let bulletBuf: string[] = [];
  const flushBullets = (key: string) => {
    if (bulletBuf.length === 0) return;
    elements.push(
      <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1">
        {bulletBuf.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>,
    );
    bulletBuf = [];
  };
  lines.forEach((line, i) => {
    if (/^[-*]\s+/.test(line)) {
      bulletBuf.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      bulletBuf.push(line.replace(/^\d+\.\s+/, ""));
    } else if (line.trim() === "") {
      flushBullets(`b-${i}`);
    } else {
      flushBullets(`b-${i}`);
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {line}
        </p>,
      );
    }
  });
  flushBullets("end");
  return <div className="space-y-2 text-sm">{elements}</div>;
}

export function AICopilotSidepanel({
  sessionId,
  contactId,
  dealTeamContactId,
  teamId,
  tenantId,
}: Props) {
  const enabled = !!sessionId && !!contactId && !!dealTeamContactId;
  const { context, action, questions, isStreaming, error, proposal } = useAILiveContext({
    sessionId,
    contactId,
    dealTeamContactId,
    enabled,
  });
  const { execute, reject } = useAIProposalExecutor();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Reset dialog when contact changes.
  useEffect(() => {
    setDialogOpen(false);
  }, [contactId]);

  const canExecuteProposal =
    !!proposal && !!sessionId && !!contactId && !!dealTeamContactId && !!teamId && !!tenantId;

  const runConfirm = () => {
    if (!canExecuteProposal || !proposal) return;
    execute.mutate(
      {
        proposal,
        contactId: contactId!,
        dealTeamContactId: dealTeamContactId!,
        teamId: teamId!,
        tenantId: tenantId!,
        sessionId: sessionId!,
      },
      { onSettled: () => setDialogOpen(false) },
    );
  };

  const runReject = () => {
    if (!canExecuteProposal || !proposal) return;
    reject.mutate({
      proposal,
      contactId: contactId!,
      dealTeamContactId: dealTeamContactId!,
      teamId: teamId!,
      tenantId: tenantId!,
      sessionId: sessionId!,
    });
    setDialogOpen(false);
  };

  if (!enabled) {
    return (
      <Card className="self-start">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Asystent AI
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {sessionId
            ? "Wybierz kontakt z agendy, aby zobaczyć podpowiedzi AI."
            : "Uruchom odprawę, aby aktywować asystenta AI."}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="self-start border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            Asystent AI — błąd
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{error.message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sticky top-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Kontekst
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!context && isStreaming ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          ) : (
            renderMarkdownBlock(context)
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Sugerowana akcja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!action && isStreaming ? (
            <Skeleton className="h-3 w-full" />
          ) : (
            renderMarkdownBlock(action)
          )}
          {proposal && !isStreaming && canExecuteProposal && (
            <Button
              size="sm"
              variant="default"
              className="w-full"
              onClick={() => setDialogOpen(true)}
              disabled={execute.isPending}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Propozycja: {proposal.tool.replace(/_/g, ' ')}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-primary" />
            Pytania wspierające
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!questions && isStreaming ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ) : (
            renderMarkdownBlock(questions)
          )}
        </CardContent>
      </Card>

      <AIProposalDialog
        proposal={proposal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={runConfirm}
        onReject={runReject}
        isExecuting={execute.isPending}
      />
    </div>
  );
}