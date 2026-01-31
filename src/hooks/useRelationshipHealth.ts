import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RelationshipAlert {
  contactId: string;
  contactName: string;
  company: string | null;
  daysSinceContact: number;
  healthScore: number;
  status: 'healthy' | 'warning' | 'critical';
}

export function useRelationshipHealth() {
  const [alerts, setAlerts] = useState<RelationshipAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelationshipHealth() {
      try {
        setIsLoading(true);
        
        // Get all active contacts with their group info
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('id, full_name, company, last_contact_date, primary_group_id')
          .eq('is_active', true)
          .order('last_contact_date', { ascending: true, nullsFirst: true });
        
        if (contactsError) throw contactsError;
        
        // Get contact groups with refresh policies
        const { data: groups, error: groupsError } = await supabase
          .from('contact_groups')
          .select('id, refresh_days, include_in_health_stats');
        
        if (groupsError) throw groupsError;
        
        // Create maps for group policies
        const groupRefreshMap = new Map<string, number>();
        const groupIncludeMap = new Map<string, boolean>();
        
        (groups || []).forEach(g => {
          groupRefreshMap.set(g.id, g.refresh_days ?? 90);
          groupIncludeMap.set(g.id, g.include_in_health_stats ?? true);
        });
        
        const now = new Date();
        const defaultRefreshDays = 90;
        const alertsData: RelationshipAlert[] = [];
        
        for (const contact of contacts || []) {
          // Skip contacts in groups with include_in_health_stats = false
          if (contact.primary_group_id && groupIncludeMap.get(contact.primary_group_id) === false) {
            continue;
          }
          
          const refreshDays = contact.primary_group_id 
            ? (groupRefreshMap.get(contact.primary_group_id) ?? defaultRefreshDays)
            : defaultRefreshDays;
          
          const lastContactDate = contact.last_contact_date 
            ? new Date(contact.last_contact_date) 
            : null;
          
          const daysSinceContact = lastContactDate 
            ? Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999; // Very high number if never contacted
          
          let healthScore: number;
          let status: 'healthy' | 'warning' | 'critical';
          
          // Use group-specific refresh_days for health calculation
          if (daysSinceContact < refreshDays) {
            healthScore = 100;
            status = 'healthy';
          } else if (daysSinceContact < refreshDays * 1.25) {
            healthScore = 75;
            status = 'healthy';
          } else if (daysSinceContact < refreshDays * 1.5) {
            healthScore = 50;
            status = 'warning';
          } else if (daysSinceContact < refreshDays * 2) {
            healthScore = 25;
            status = 'warning';
          } else {
            healthScore = 10;
            status = 'critical';
          }
          
          // Only include warning and critical contacts
          if (status !== 'healthy') {
            alertsData.push({
              contactId: contact.id,
              contactName: contact.full_name,
              company: contact.company,
              daysSinceContact,
              healthScore,
              status,
            });
          }
        }
        
        // Sort by days since contact (most urgent first)
        alertsData.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
        
        setAlerts(alertsData.slice(0, 10)); // Limit to top 10
      } catch (err) {
        console.error('Error fetching relationship health:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch relationship health');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRelationshipHealth();
  }, []);
  
  return { alerts, isLoading, error };
}
