import { Building, Briefcase, Linkedin, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkedInNetworkContact, useDeleteLinkedInContact } from "@/hooks/useLinkedInNetwork";
import { Link } from "react-router-dom";

interface LinkedInContactCardProps {
  contact: LinkedInNetworkContact;
}

export function LinkedInContactCard({ contact }: LinkedInContactCardProps) {
  const deleteContact = useDeleteLinkedInContact();

  const handleDelete = () => {
    if (confirm('Czy na pewno chcesz usunąć ten kontakt z sieci?')) {
      deleteContact.mutate(contact.id);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0077B5]/10 flex items-center justify-center">
          <Linkedin className="h-5 w-5 text-[#0077B5]" />
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {contact.full_name}
            </span>
            {contact.matched_contact_id && (
              <Link to={`/contacts/${contact.matched_contact_id}`}>
                <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  W bazie
                </Badge>
              </Link>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {contact.company && (
              <div className="flex items-center gap-1 truncate">
                <Building className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
            {contact.position && (
              <div className="flex items-center gap-1 truncate">
                <Briefcase className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contact.position}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {contact.linkedin_url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#0077B5] hover:text-[#0077B5] hover:bg-[#0077B5]/10"
            asChild
          >
            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteContact.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
