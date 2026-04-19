import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyDayTaskOverdue {
  id: string;
  title: string;
  due_date: string;
  priority: string | null;
  contact_id: string | null;
  contact_name: string | null;
  company_name: string | null;
}

export interface MyDayConsultation {
  id: string;
  scheduled_at: string;
  contact_id: string | null;
  contact_name: string | null;
  location: string | null;
  is_virtual: boolean | null;
  status: string | null;
}

export interface MyDayResult {
  tasks_overdue: MyDayTaskOverdue[];
  consultations_today: MyDayConsultation[];
  top_ai_recs: Array<{ id: string; title: string; content: string }>;
  deals_recent_changes: Array<{ entity_id: string; action: string; created_at: string }>;
  tasks_today_count: number;
  generated_at: string;
}

export function useDashboardMyDay() {
  const { director } = useAuth();
  return useQuery({
    queryKey: ['dashboard-myday', director?.id],
    enabled: !!director?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<MyDayResult> => {
      const { data, error } = await supabase.rpc('rpc_dashboard_myday');
      if (error) throw error;
      return data as unknown as MyDayResult;
    },
  });
}
