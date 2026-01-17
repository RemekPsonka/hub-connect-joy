import { useState } from 'react';
import { 
  Rocket, 
  ChevronDown, 
  ChevronRight, 
  Lightbulb, 
  Target, 
  Users,
  Clock,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { TurboAgentResult as TurboResultType, TurboCategory, TurboRecommendation } from '@/hooks/useTurboAgent';

interface TurboAgentResultProps {
  result: TurboResultType;
}

function CategorySection({ category }: { category: TurboCategory }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">{category.name}</span>
          </div>
          <Badge variant="secondary">{category.count}</Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 space-y-2">
        {category.contacts.map((contact, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => contact.contact_id && navigate(`/contacts/${contact.contact_id}`)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{contact.name}</p>
              <p className="text-xs text-muted-foreground truncate">{contact.answer}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="w-16">
                <Progress value={contact.confidence * 100} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {(contact.confidence * 100).toFixed(0)}%
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function RecommendationCard({ recommendation, rank }: { recommendation: TurboRecommendation; rank: number }) {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => recommendation.contact_id && navigate(`/contacts/${recommendation.contact_id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              rank === 1 && "bg-yellow-500/20 text-yellow-600",
              rank === 2 && "bg-gray-400/20 text-gray-600",
              rank === 3 && "bg-orange-400/20 text-orange-600",
              rank > 3 && "bg-muted text-muted-foreground"
            )}>
              #{rank}
            </div>
            <div>
              <p className="font-semibold">{recommendation.contact_name}</p>
              <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
            </div>
          </div>
          <Badge variant={recommendation.score >= 0.8 ? "default" : "secondary"}>
            {(recommendation.score * 100).toFixed(0)}%
          </Badge>
        </div>
        {recommendation.suggested_action && (
          <div className="mt-3 flex items-center gap-2 text-sm text-primary">
            <Target className="h-4 w-4" />
            <span>{recommendation.suggested_action}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TurboAgentResult({ result }: TurboAgentResultProps) {
  const { result: data, duration_ms, agents_selected, agents_responded, relevant_responses } = result;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Rocket className="h-5 w-5 text-orange-500" />
              Agent Turbo - Wyniki
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{agents_responded}/{agents_selected}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{relevant_responses} relevantnych</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{(duration_ms / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Categories */}
      {data.categories && data.categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Kategorie
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.categories.map((category, idx) => (
                <CategorySection key={idx} category={category} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Recommendations */}
      {data.top_recommendations && data.top_recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Top Rekomendacje
          </h4>
          <div className="grid gap-2">
            {data.top_recommendations.slice(0, 5).map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} rank={idx + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {data.next_steps && data.next_steps.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Następne kroki
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {data.next_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
