import { DealActivitiesTimeline } from './DealActivitiesTimeline';
import { DealActivity } from '@/hooks/useDeals';

interface DealTimelineProps {
  activities: DealActivity[];
  isLoading: boolean;
  currency?: string;
}

export function DealTimeline({ activities, isLoading, currency }: DealTimelineProps) {
  return (
    <DealActivitiesTimeline
      activities={activities}
      isLoading={isLoading}
      currency={currency}
    />
  );
}
