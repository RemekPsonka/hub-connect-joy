import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  ExposureLocation, 
  LocationExposure, 
  RiskAlert, 
  ActivityType, 
  ConstructionType,
  getRiskTier 
} from '@/components/exposure/types';
import { VALUE_THRESHOLDS } from '@/components/exposure/types';

interface CreateLocationData {
  name: string;
  address?: string;
  city?: string;
  activity_type: ActivityType;
  construction_type?: ConstructionType;
}

interface UpdateLocationData {
  id: string;
  name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  activity_type?: ActivityType;
  construction_type?: ConstructionType;
  building_value?: number;
  machinery_value?: number;
  stock_value?: number;
  stock_fluctuation?: boolean;
  notes?: string;
}

export function useExposureLocations(companyId: string) {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  const { data: locations, isLoading } = useQuery({
    queryKey: ['exposure-locations', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exposure_locations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ExposureLocation[];
    },
    enabled: !!companyId && !!tenantId,
  });

  const createLocation = useMutation({
    mutationFn: async (newLocation: CreateLocationData) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      
      const { data, error } = await supabase
        .from('exposure_locations')
        .insert({
          company_id: companyId,
          tenant_id: tenantId,
          name: newLocation.name,
          address: newLocation.address,
          city: newLocation.city,
          activity_type: newLocation.activity_type,
          construction_type: newLocation.construction_type || 'non_combustible',
          building_value: 0,
          machinery_value: 0,
          stock_value: 0,
          stock_fluctuation: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exposure-locations', companyId] });
      toast.success('Lokalizacja dodana');
    },
    onError: (error) => {
      console.error('Error creating location:', error);
      toast.error('Błąd podczas dodawania lokalizacji');
    },
  });

  const updateLocation = useMutation({
    mutationFn: async (updates: UpdateLocationData) => {
      const { id, ...updateFields } = updates;
      
      const { data, error } = await supabase
        .from('exposure_locations')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exposure-locations', companyId] });
    },
    onError: (error) => {
      console.error('Error updating location:', error);
      toast.error('Błąd podczas aktualizacji lokalizacji');
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from('exposure_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exposure-locations', companyId] });
      toast.success('Lokalizacja usunięta');
    },
    onError: (error) => {
      console.error('Error deleting location:', error);
      toast.error('Błąd podczas usuwania lokalizacji');
    },
  });

  // Computed: Locations with calculated totals and risk tiers
  const locationsWithExposure: LocationExposure[] = useMemo(() => {
    if (!locations) return [];
    
    return locations.map(loc => {
      const total_value = 
        Number(loc.building_value || 0) + 
        Number(loc.machinery_value || 0) + 
        Number(loc.stock_value || 0);
      
      let risk_tier: 'low' | 'medium' | 'high' = 'low';
      if (total_value >= VALUE_THRESHOLDS.MEDIUM) risk_tier = 'high';
      else if (total_value >= VALUE_THRESHOLDS.LOW) risk_tier = 'medium';
      
      return { ...loc, total_value, risk_tier };
    });
  }, [locations]);

  // Computed: Total Insured Value
  const totalTIV = useMemo(() => 
    locationsWithExposure.reduce((sum, loc) => sum + loc.total_value, 0),
    [locationsWithExposure]
  );

  // Computed: Top risk location
  const topRiskLocation = useMemo(() => {
    if (locationsWithExposure.length === 0) return null;
    return locationsWithExposure.reduce((max, loc) => 
      loc.total_value > (max?.total_value || 0) ? loc : max
    , locationsWithExposure[0]);
  }, [locationsWithExposure]);

  // Computed: Risk alerts based on business logic
  const riskAlerts = useMemo(() => {
    const alerts: RiskAlert[] = [];
    
    // Alert: More than 5 locations
    if (locationsWithExposure.length > 5) {
      alerts.push({
        id: 'master-policy',
        type: 'info',
        message: 'Rozważ polisę Master z sumami zmiennymi',
      });
    }
    
    locationsWithExposure.forEach(loc => {
      // Alert: Stock > Building in warehouse
      if (
        Number(loc.stock_value) > Number(loc.building_value) && 
        loc.activity_type === 'warehouse'
      ) {
        alerts.push({
          id: `fire-${loc.id}`,
          type: 'warning',
          locationId: loc.id,
          message: `${loc.name}: Sprawdź systemy p.poż (tryskacze?)`,
        });
      }
      
      // Alert: Combustible construction with high value
      const propertyValue = Number(loc.building_value) + Number(loc.machinery_value);
      if (loc.construction_type === 'combustible' && propertyValue > 20_000_000) {
        alerts.push({
          id: `combustible-${loc.id}`,
          type: 'warning',
          locationId: loc.id,
          message: `${loc.name}: Ryzyko pożarowe - konstrukcja palna przy wysokiej wartości`,
        });
      }
      
      // Alert: Stock fluctuation without noting
      if (loc.stock_fluctuation && Number(loc.stock_value) > 10_000_000) {
        alerts.push({
          id: `fluctuation-${loc.id}`,
          type: 'info',
          locationId: loc.id,
          message: `${loc.name}: Rozważ klauzulę magazynową ze zmienną sumą`,
        });
      }
    });
    
    return alerts;
  }, [locationsWithExposure]);

  return {
    locations: locationsWithExposure,
    isLoading,
    createLocation,
    updateLocation,
    deleteLocation,
    totalTIV,
    topRiskLocation,
    riskAlerts,
    locationCount: locationsWithExposure.length,
  };
}
