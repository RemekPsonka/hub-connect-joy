import { useState } from "react";
import { Linkedin, Sparkles, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLinkedInNetwork, useLinkedInData, useParseLinkedInData } from "@/hooks/useLinkedInNetwork";
import { LinkedInContactCard } from "./LinkedInContactCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkedInNetworkSectionProps {
  contactId: string;
  contactName: string;
}

export function LinkedInNetworkSection({ contactId, contactName }: LinkedInNetworkSectionProps) {
  const [pastedContent, setPastedContent] = useState("");
  const [isCareerOpen, setIsCareerOpen] = useState(true);
  const [isNetworkOpen, setIsNetworkOpen] = useState(true);

  const { data: networkContacts, isLoading: isLoadingNetwork } = useLinkedInNetwork(contactId);
  const { data: linkedInData, isLoading: isLoadingData } = useLinkedInData(contactId);
  const parseData = useParseLinkedInData();

  const handleAnalyze = () => {
    if (!pastedContent.trim()) return;
    
    parseData.mutate(
      { contactId, content: pastedContent, contactName },
      { onSuccess: () => setPastedContent("") }
    );
  };

  const hasCareerData = linkedInData && (
    (linkedInData.career_history?.length ?? 0) > 0 ||
    (linkedInData.education?.length ?? 0) > 0 ||
    (linkedInData.skills?.length ?? 0) > 0 ||
    linkedInData.summary ||
    linkedInData.about
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Linkedin className="h-5 w-5 text-[#0077B5]" />
        <h2 className="text-lg font-semibold">SIEĆ LINKEDIN</h2>
      </div>
      <Separator />

      {/* Input Section */}
      <div className="space-y-3">
        <Textarea
          placeholder={`Wklej tutaj dane skopiowane z LinkedIn...

Możesz wkleić:
• Profil osoby (kariera, edukacja, umiejętności)
• Listę kontaktów/połączeń
• Widok "People also viewed"

Dane są analizowane przez AI i dodawane przyrostowo.`}
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          className="min-h-[120px] resize-y"
          disabled={parseData.isPending}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAnalyze}
            disabled={!pastedContent.trim() || parseData.isPending}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {parseData.isPending ? "Analizuję..." : "Analizuj AI"}
          </Button>
        </div>
      </div>

      {/* Career Data Section */}
      {(hasCareerData || isLoadingData) && (
        <Collapsible open={isCareerOpen} onOpenChange={setIsCareerOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2 h-auto">
              <span className="flex items-center gap-2 font-medium">
                <Linkedin className="h-4 w-4 text-[#0077B5]" />
                Dane z profilu LinkedIn
              </span>
              {isCareerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {isLoadingData ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <>
                {/* About */}
                {linkedInData?.about && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">O mnie</h4>
                    <p className="text-sm">{linkedInData.about}</p>
                  </div>
                )}

                {/* Summary */}
                {linkedInData?.summary && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">Podsumowanie</h4>
                    <p className="text-sm">{linkedInData.summary}</p>
                  </div>
                )}

                {/* Career History */}
                {linkedInData?.career_history && linkedInData.career_history.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Kariera</h4>
                    <div className="space-y-2">
                      {linkedInData.career_history.map((job, index) => (
                        <div key={index} className="text-sm border-l-2 border-primary/30 pl-3">
                          <div className="font-medium">{job.position}</div>
                          <div className="text-muted-foreground">{job.company}</div>
                          {(job.start_date || job.end_date) && (
                            <div className="text-xs text-muted-foreground">
                              {job.start_date} - {job.end_date || "obecnie"}
                            </div>
                          )}
                          {job.description && (
                            <div className="text-xs mt-1">{job.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {linkedInData?.education && linkedInData.education.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Edukacja</h4>
                    <div className="space-y-2">
                      {linkedInData.education.map((edu, index) => (
                        <div key={index} className="text-sm border-l-2 border-secondary/50 pl-3">
                          <div className="font-medium">{edu.school}</div>
                          {edu.degree && (
                            <div className="text-muted-foreground">
                              {edu.degree}{edu.field ? `, ${edu.field}` : ""}
                            </div>
                          )}
                          {(edu.start_date || edu.end_date) && (
                            <div className="text-xs text-muted-foreground">
                              {edu.start_date} - {edu.end_date || "obecnie"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {linkedInData?.skills && linkedInData.skills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Umiejętności</h4>
                    <div className="flex flex-wrap gap-1">
                      {linkedInData.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                {linkedInData?.last_updated && (
                  <div className="text-xs text-muted-foreground pt-2">
                    Ostatnia aktualizacja: {new Date(linkedInData.last_updated).toLocaleDateString('pl-PL')}
                  </div>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Network Contacts Section */}
      <Collapsible open={isNetworkOpen} onOpenChange={setIsNetworkOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
            <span className="flex items-center gap-2 font-medium">
              <Users className="h-4 w-4 text-[#0077B5]" />
              Znane osoby
              {networkContacts && networkContacts.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {networkContacts.length}
                </Badge>
              )}
            </span>
            {isNetworkOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {isLoadingNetwork ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : networkContacts && networkContacts.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {networkContacts.map((contact) => (
                <LinkedInContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak kontaktów z sieci LinkedIn</p>
              <p className="text-xs">Wklej dane z LinkedIn aby dodać osoby</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
