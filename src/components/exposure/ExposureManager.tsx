import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, MapPinned, List } from 'lucide-react';
import { useExposureLocations } from '@/hooks/useExposureLocations';
import { ExposureMapView } from './ExposureMapView';
import { LocationCard } from './LocationCard';
import { ExposureSummaryFooter } from './ExposureSummaryFooter';
import { RiskAlerts } from './RiskAlerts';
import { AddLocationModal } from './AddLocationModal';
import { EmptyState } from '@/components/ui/empty-state';
import type { LocationExposure } from './types';

interface ExposureManagerProps {
  companyId: string;
}

export function ExposureManager({ companyId }: ExposureManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const {
    locations,
    isLoading,
    createLocation,
    updateLocation,
    deleteLocation,
    totalTIV,
    topRiskLocation,
    riskAlerts,
    locationCount,
  } = useExposureLocations(companyId);

  const handleAddLocation = (data: {
    name: string;
    address?: string;
    city?: string;
    activity_type: 'production' | 'warehouse' | 'office' | 'retail';
  }) => {
    createLocation.mutate(data, {
      onSuccess: () => setIsModalOpen(false),
    });
  };

  const handleUpdateLocation = (locationId: string, updates: Partial<LocationExposure>) => {
    updateLocation.mutate({ id: locationId, ...updates });
  };

  const handleDeleteLocation = (locationId: string) => {
    deleteLocation.mutate(locationId);
  };

  const handleLocationClick = (locationId: string) => {
    const cardElement = cardRefs.current[locationId];
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardElement.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        cardElement.classList.remove('ring-2', 'ring-primary');
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj lokalizację
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
            className="gap-1.5"
          >
            <MapPinned className="h-4 w-4" />
            <span className="hidden sm:inline">Mapa</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-1.5"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {locations.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Brak lokalizacji"
          description="Dodaj lokalizacje firmy, aby śledzić ekspozycję ubezpieczeniową."
          action={{
            label: 'Dodaj pierwszą lokalizację',
            onClick: () => setIsModalOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <>
          <div className={viewMode === 'split' ? 'grid lg:grid-cols-2 gap-4' : ''}>
            {/* Map View */}
            {viewMode === 'split' && (
              <div className="lg:sticky lg:top-4 lg:self-start">
                <ExposureMapView
                  locations={locations}
                  onAddLocation={() => setIsModalOpen(true)}
                  onLocationClick={handleLocationClick}
                />
              </div>
            )}

            {/* Location Cards */}
            <div className="space-y-4">
              {locations.map((location) => (
                <div
                  key={location.id}
                  ref={(el) => (cardRefs.current[location.id] = el)}
                  className="transition-all duration-300"
                >
                  <LocationCard
                    location={location}
                    onUpdate={(updates) => handleUpdateLocation(location.id, updates)}
                    onDelete={() => handleDeleteLocation(location.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Summary Footer */}
          <ExposureSummaryFooter
            locationCount={locationCount}
            totalTIV={totalTIV}
            topRiskLocation={topRiskLocation}
          />

          {/* Risk Alerts */}
          {riskAlerts.length > 0 && (
            <RiskAlerts alerts={riskAlerts} />
          )}
        </>
      )}

      {/* Add Location Modal */}
      <AddLocationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleAddLocation}
        isLoading={createLocation.isPending}
      />
    </div>
  );
}
