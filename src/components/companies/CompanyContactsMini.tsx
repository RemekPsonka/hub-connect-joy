import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyContacts } from '@/hooks/useCompanies';

interface CompanyContactsMiniProps {
  companyId: string;
}

const MAX_DISPLAY = 5;

export function CompanyContactsMini({ companyId }: CompanyContactsMiniProps) {
  const navigate = useNavigate();
  const { data: contacts, isLoading } = useCompanyContacts(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Kontakty
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalCount = contacts?.length || 0;
  const displayContacts = contacts?.slice(0, MAX_DISPLAY) || [];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Kontakty
          {totalCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({totalCount})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {displayContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak kontaktów</p>
        ) : (
          <div className="space-y-2">
            {displayContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="flex items-center gap-2 w-full text-left rounded-md p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {contact.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{contact.full_name}</p>
                  {contact.position && (
                    <p className="text-xs text-muted-foreground truncate">{contact.position}</p>
                  )}
                </div>
              </button>
            ))}

            {totalCount > MAX_DISPLAY && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {/* Tab switching handled by parent if needed */}}
              >
                Pokaż wszystkich ({totalCount})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
