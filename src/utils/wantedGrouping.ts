import { WantedContact } from '@/hooks/useWantedContacts';

export interface RequesterInfo {
  contactId: string;
  name: string;
  wantedId: string;
}

export function buildRequesterGroups(items: WantedContact[]): Map<string, RequesterInfo[]> {
  const groups = new Map<string, RequesterInfo[]>();
  for (const item of items) {
    const key = `${(item.person_name || '').toLowerCase().trim()}|${(item.company_name || '').toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({
      contactId: item.requested_by_contact_id,
      name: item.requested_by_contact?.full_name || 'Nieznany',
      wantedId: item.id,
    });
  }
  return groups;
}

export function getOtherRequesters(item: WantedContact, groups: Map<string, RequesterInfo[]>): RequesterInfo[] {
  const key = `${(item.person_name || '').toLowerCase().trim()}|${(item.company_name || '').toLowerCase().trim()}`;
  const all = groups.get(key) || [];
  return all.filter(r => r.wantedId !== item.id);
}
