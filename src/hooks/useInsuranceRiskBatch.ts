 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import type { StatusUbezpieczenia } from '@/components/insurance/types';
 import type { InsuranceStatus } from '@/components/structure/types';
 import type { Json } from '@/integrations/supabase/types';
 
 interface RiskAssessmentRow {
   id: string;
   company_id: string;
   ryzyko_majatkowe: Json | null;
   ryzyko_oc: Json | null;
   ryzyko_flota: Json | null;
 }
 
 // Agregacja statusów z wielu domen ryzyka
 function aggregateStatus(row: RiskAssessmentRow): InsuranceStatus {
   const statuses: (StatusUbezpieczenia | undefined)[] = [];
   
   // Pobierz statusy z poszczególnych domen
   const majatkowe = row.ryzyko_majatkowe as { status?: StatusUbezpieczenia } | null;
   const oc = row.ryzyko_oc as { status?: StatusUbezpieczenia } | null;
   const flota = row.ryzyko_flota as { status?: StatusUbezpieczenia } | null;
   
   if (majatkowe?.status && majatkowe.status !== 'nie_dotyczy') statuses.push(majatkowe.status);
   if (oc?.status && oc.status !== 'nie_dotyczy') statuses.push(oc.status);
   if (flota?.status && flota.status !== 'nie_dotyczy') statuses.push(flota.status);
   
   // Priorytet: jeśli JAKAKOLWIEK domena ma lukę -> gap
   if (statuses.includes('luka')) return 'gap';
   
   // Jeśli wszystkie aktywne domeny ubezpieczone -> insured
   if (statuses.length > 0 && statuses.every(s => s === 'ubezpieczone')) return 'insured';
   
   // Brak danych lub wszystko N/D -> unknown
   return 'unknown';
 }
 
 export function useInsuranceRiskBatch(companyIds: string[]) {
   return useQuery({
     queryKey: ['insurance-risk-batch', ...companyIds.sort()],
     queryFn: async () => {
       if (companyIds.length === 0) return new Map<string, InsuranceStatus>();
       
       const { data, error } = await supabase
         .from('insurance_risk_assessments')
         .select('id, company_id, ryzyko_majatkowe, ryzyko_oc, ryzyko_flota')
         .in('company_id', companyIds);
       
       if (error) {
         console.error('Error fetching insurance assessments:', error);
         return new Map<string, InsuranceStatus>();
       }
       
       const result = new Map<string, InsuranceStatus>();
       
       for (const row of data || []) {
         const status = aggregateStatus(row);
         result.set(row.company_id, status);
       }
       
       return result;
     },
     enabled: companyIds.length > 0,
     staleTime: 5 * 60 * 1000, // 5 minut
   });
 }