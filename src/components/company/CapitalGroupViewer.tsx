import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  BadgeCheck, 
  Link2,
  Crown,
  GitBranch,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CapitalGroupGraph } from './CapitalGroupGraph';
import { AddCapitalGroupMemberModal } from './AddCapitalGroupMemberModal';
import { 
  useCapitalGroupMembers, 
  useRemoveCapitalGroupMember,
  type CapitalGroupMember 
} from '@/hooks/useCapitalGroupMembers';

interface CapitalGroupViewerProps {
  company: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
}

function formatRevenue(amount: number | null | undefined): string {
  if (!amount) return '-';
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} mld PLN`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} mln PLN`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} tys. PLN`;
  }
  return `${amount} PLN`;
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'parent': return 'Spółka matka';
    case 'subsidiary': return 'Spółka zależna';
    case 'affiliate': return 'Spółka stowarzyszona';
    case 'branch': return 'Oddział';
    default: return role;
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'parent': return <Crown className="h-4 w-4 text-amber-600" />;
    case 'subsidiary': return <GitBranch className="h-4 w-4 text-blue-600" />;
    case 'branch': return <GitBranch className="h-4 w-4 text-green-600" />;
    default: return <Link2 className="h-4 w-4 text-muted-foreground" />;
  }
}

export function CapitalGroupViewer({ company }: CapitalGroupViewerProps) {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<CapitalGroupMember | null>(null);
  
  const { data: members = [], isLoading } = useCapitalGroupMembers(company.id);
  const removeMember = useRemoveCapitalGroupMember();
  
  // Calculate totals
  const totalRevenue = members.reduce((sum, m) => {
    const rev = m.member_company?.revenue_amount || m.revenue_amount || 0;
    return sum + rev;
  }, 0);
  
  const linkedCount = members.filter(m => m.member_company_id).length;
  const krsVerifiedCount = members.filter(m => m.krs_verified).length;
  
  const handleDelete = async () => {
    if (!memberToDelete) return;
    await removeMember.mutateAsync({
      memberId: memberToDelete.id,
      parentCompanyId: company.id
    });
    setMemberToDelete(null);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Grupa kapitałowa
              <Badge variant="outline">{members.length} spółek</Badge>
            </CardTitle>
            <Button onClick={() => setIsAddModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Dodaj spółkę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-muted-foreground">Łącznie spółek</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{formatRevenue(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Suma przychodów</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{linkedCount}</p>
              <p className="text-xs text-muted-foreground">Powiązanych w bazie</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{krsVerifiedCount}</p>
              <p className="text-xs text-muted-foreground">Z weryfikacją KRS</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Visual graph */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Struktura grupy</CardTitle>
        </CardHeader>
        <CardContent>
          <CapitalGroupGraph members={members} currentCompany={company} />
        </CardContent>
      </Card>
      
      {/* Table with all members */}
      {members.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lista spółek w grupie</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>KRS</TableHead>
                  <TableHead className="text-right">Udziały</TableHead>
                  <TableHead className="text-right">Przychód</TableHead>
                  <TableHead>Źródło</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.relationship_type)}
                        {member.member_company_id ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium"
                            onClick={() => navigate(`/contacts/company/${member.member_company_id}`)}
                          >
                            {member.external_name}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <span className="font-medium">{member.external_name}</span>
                        )}
                        {member.member_company_id && (
                          <Badge variant="secondary" className="text-[10px]">
                            W bazie
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(member.relationship_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {member.external_nip || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {member.external_krs || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.ownership_percent ? `${member.ownership_percent}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatRevenue(member.member_company?.revenue_amount || member.revenue_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {member.krs_verified && (
                          <Badge variant="default" className="text-[10px] bg-green-600">
                            <BadgeCheck className="h-3 w-3 mr-0.5" />
                            KRS
                          </Badge>
                        )}
                        {!member.krs_verified && (
                          <span className="text-xs text-muted-foreground">
                            {member.data_source === 'manual' ? 'Ręczne' : 
                             member.data_source === 'ai_enrichment' ? 'AI' : 
                             member.data_source}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setMemberToDelete(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Add modal */}
      <AddCapitalGroupMemberModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        parentCompanyId={company.id}
      />
      
      {/* Delete confirmation */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń spółkę z grupy</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć <strong>{memberToDelete?.external_name}</strong> z grupy kapitałowej?
              Ta operacja nie usunie samej firmy z bazy danych.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
