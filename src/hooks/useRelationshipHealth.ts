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
        
        // Get all active contacts
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('id, full_name, company, last_contact_date')
          .eq('is_active', true)
          .order('last_contact_date', { ascending: true, nullsFirst: true });
        
        if (contactsError) throw contactsError;
        
        const now = new Date();
        const alertsData: RelationshipAlert[] = [];
        
        for (const contact of contacts || []) {
          const lastContactDate = contact.last_contact_date 
            ? new Date(contact.last_contact_date) 
            : null;
          
          const daysSinceContact = lastContactDate 
            ? Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999; // Very high number if never contacted
          
          let healthScore: number;
          let status: 'healthy' | 'warning' | 'critical';
          
          if (daysSinceContact <= 30) {
            healthScore = 100;
            status = 'healthy';
          } else if (daysSinceContact <= 60) {
            healthScore = 75;
            status = 'healthy';
          } else if (daysSinceContact <= 90) {
            healthScore = 50;
            status = 'warning';
          } else if (daysSinceContact <= 180) {
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
