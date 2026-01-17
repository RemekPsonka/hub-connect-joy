import { MasterAgentResponse } from '@/hooks/useContactAgent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  Brain, 
  Users, 
  Lightbulb, 
  ArrowRight,
  Building2,
  Sparkles
} from 'lucide-react';

interface MasterAgentMessageProps {
  response: MasterAgentResponse;
}

export function MasterAgentMessage({ response }: MasterAgentMessageProps) {
  return (
    <div className="space-y-4">
      {/* Main Answer */}
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2">
        <ReactMarkdown>{response.answer}</ReactMarkdown>
      </div>

      {/* Related Contacts */}
      {response.related_contacts && response.related_contacts.length > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Powiązane kontakty ({response.related_contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {response.related_contacts.map((contact) => (
              <Link
                key={contact.contact_id}
                to={`/contacts/${contact.contact_id}`}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{contact.name}</span>
                    {contact.company && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.relevance}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {response.recommendations && response.recommendations.length > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Rekomendacje ({response.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {response.recommendations.map((rec, idx) => (
              <div 
                key={idx}
                className="p-2 rounded-md bg-background border space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{rec.action}</span>
                  <Badge 
                    variant={rec.confidence >= 0.7 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(rec.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rec.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Potential Matches */}
      {response.potential_matches && response.potential_matches.length > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Potencjalne dopasowania ({response.potential_matches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {response.potential_matches.map((match, idx) => (
              <div 
                key={idx}
                className="p-2 rounded-md bg-background border"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    to={`/contacts/${match.contact_a.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {match.contact_a.name}
                  </Link>
                  <span className="text-muted-foreground">↔</span>
                  <Link 
                    to={`/contacts/${match.contact_b.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {match.contact_b.name}
                  </Link>
                  <Badge 
                    variant={match.confidence >= 0.7 ? "default" : "secondary"}
                    className="ml-auto text-xs"
                  >
                    {Math.round(match.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{match.match_reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      {response.agents_consulted && response.agents_consulted.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Brain className="h-3 w-3" />
          <span>
            Skonsultowano {response.agents_consulted.length} agentów z {response.total_agents} dostępnych
          </span>
        </div>
      )}
    </div>
  );
}
