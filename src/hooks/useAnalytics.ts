import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, subDays, subYears, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { pl } from 'date-fns/locale';

export interface AnalyticsMetrics {
  totalContacts: number;
  contactsGrowth: number;
  activeNeeds: number;
  needsFulfillmentRate: number;
  totalMeetings: number;
  avgMeetingsPerWeek: number;
  successfulMatches: number;
  matchSuccessRate: number;
  activeOffers: number;
}

export interface TimelineDataPoint {
  date: string;
  contacts: number;
  meetings: number;
  tasks: number;
}

export interface IndustryDataPoint {
  name: string;
  value: number;
}

export interface MeetingOutcomeDataPoint {
  outcome: string;
  count: number;
}

export interface CategoryDataPoint {
  category: string;
  matches: number;
}

export interface NetworkHealth {
  healthy: number;
  healthyPercent: number;
  warning: number;
  warningPercent: number;
  critical: number;
  criticalPercent: number;
}

export interface AIInsight {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'opportunity';
}

export interface AnalyticsData {
  metrics: AnalyticsMetrics;
  activityTimeline: TimelineDataPoint[];
  contactsByIndustry: IndustryDataPoint[];
  meetingOutcomes: MeetingOutcomeDataPoint[];
  topCategories: CategoryDataPoint[];
  networkHealth: NetworkHealth;
}

type DateRangeValue = '7d' | '30d' | '90d' | '1y' | 'all';

const getDateRange = (range: DateRangeValue): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  let startDate: Date;

  switch (range) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '90d':
      startDate = subDays(endDate, 90);
      break;
    case '1y':
      startDate = subYears(endDate, 1);
      break;
    case 'all':
    default:
      startDate = new Date('2020-01-01');
      break;
  }

  return { startDate: startOfDay(startDate), endDate };
};

const getPreviousPeriodRange = (range: DateRangeValue, startDate: Date, endDate: Date) => {
  const duration = endDate.getTime() - startDate.getTime();
  return {
    startDate: new Date(startDate.getTime() - duration),
    endDate: new Date(startDate.getTime() - 1),
  };
};

export function useAnalytics(dateRange: DateRangeValue = '30d') {
  const { director } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const tenantId = director?.tenant_id;

  useEffect(() => {
    if (!tenantId) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { startDate, endDate } = getDateRange(dateRange);
        const prevPeriod = getPreviousPeriodRange(dateRange, startDate, endDate);
        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();
        const prevStartStr = prevPeriod.startDate.toISOString();
        const prevEndStr = prevPeriod.endDate.toISOString();

        // Fetch all data in parallel
        const [
          contactsResult,
          prevContactsResult,
          needsResult,
          offersResult,
          consultationsResult,
          tasksResult,
          matchesResult,
          contactsWithGroupsResult,
          groupsResult,
        ] = await Promise.all([
          // Current period contacts
          supabase
            .from('contacts')
            .select('id, created_at, company')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDateStr)
            .lte('created_at', endDateStr),
          // Previous period contacts (for growth calculation)
          supabase
            .from('contacts')
            .select('id')
            .eq('tenant_id', tenantId)
            .gte('created_at', prevStartStr)
            .lte('created_at', prevEndStr),
          // All needs
          supabase
            .from('needs')
            .select('id, created_at, status, title')
            .eq('tenant_id', tenantId),
          // All offers
          supabase
            .from('offers')
            .select('id, created_at, status, title')
            .eq('tenant_id', tenantId),
          // Consultations in period
          supabase
            .from('consultations')
            .select('id, scheduled_at, status')
            .eq('tenant_id', tenantId)
            .gte('scheduled_at', startDateStr)
            .lte('scheduled_at', endDateStr),
          // Tasks in period
          supabase
            .from('tasks')
            .select('id, created_at, status')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDateStr)
            .lte('created_at', endDateStr),
          // All matches
          supabase
            .from('matches')
            .select('id, created_at, status')
            .eq('tenant_id', tenantId),
          // Contacts with groups for health calculation
          supabase
            .from('contacts')
            .select('id, last_contact_date, primary_group_id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
          // Contact groups with refresh policies
          supabase
            .from('contact_groups')
            .select('id, refresh_days, include_in_health_stats')
            .eq('tenant_id', tenantId),
        ]);

        const contacts = contactsResult.data || [];
        const prevContacts = prevContactsResult.data || [];
        const needs = needsResult.data || [];
        const offers = offersResult.data || [];
        const consultations = consultationsResult.data || [];
        const tasks = tasksResult.data || [];
        const matches = matchesResult.data || [];
        const contactsWithGroups = contactsWithGroupsResult.data || [];
        const groups = groupsResult.data || [];

        // Calculate metrics
        const totalContacts = contacts.length;
        const prevContactsCount = prevContacts.length;
        const contactsGrowth = prevContactsCount > 0 
          ? Math.round(((totalContacts - prevContactsCount) / prevContactsCount) * 100)
          : 0;

        const activeNeeds = needs.filter(n => n.status === 'active').length;
        const fulfilledNeeds = needs.filter(n => n.status === 'fulfilled').length;
        const needsFulfillmentRate = needs.length > 0 
          ? Math.round((fulfilledNeeds / needs.length) * 100) 
          : 0;

        const activeOffers = offers.filter(o => o.status === 'active').length;

        const totalMeetings = consultations.length;
        const weeks = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        const avgMeetingsPerWeek = Math.round((totalMeetings / weeks) * 10) / 10;

        const successfulMatches = matches.filter(m => m.status === 'accepted').length;
        const matchSuccessRate = matches.length > 0
          ? Math.round((successfulMatches / matches.length) * 100)
          : 0;

        // Generate activity timeline
        const activityTimeline = generateTimeline(contacts, consultations, tasks, startDate, endDate, dateRange);

        // Group by industry (using company as proxy)
        const contactsByIndustry = groupByIndustry(contacts);

        // Meeting outcomes
        const meetingOutcomes = groupMeetingsByStatus(consultations);

        // Top categories from needs
        const topCategories = getTopCategories(needs);

        // Network health - use group-specific refresh policies
        const networkHealth = calculateNetworkHealthWithGroups(contactsWithGroups, groups);

        const analyticsData: AnalyticsData = {
          metrics: {
            totalContacts,
            contactsGrowth,
            activeNeeds,
            needsFulfillmentRate,
            totalMeetings,
            avgMeetingsPerWeek,
            successfulMatches,
            matchSuccessRate,
            activeOffers,
          },
          activityTimeline,
          contactsByIndustry,
          meetingOutcomes,
          topCategories,
          networkHealth,
        };

        setData(analyticsData);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError(err as Error);
        
        // Set safe default values on error
        setData({
          metrics: {
            totalContacts: 0,
            contactsGrowth: 0,
            activeNeeds: 0,
            needsFulfillmentRate: 0,
            totalMeetings: 0,
            avgMeetingsPerWeek: 0,
            successfulMatches: 0,
            matchSuccessRate: 0,
            activeOffers: 0,
          },
          activityTimeline: [],
          contactsByIndustry: [],
          meetingOutcomes: [],
          topCategories: [],
          networkHealth: {
            healthy: 0,
            healthyPercent: 0,
            warning: 0,
            warningPercent: 0,
            critical: 0,
            criticalPercent: 0,
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [tenantId, dateRange]);

  const generateAIInsights = async () => {
    if (!data) return;
    
    setIsLoadingInsights(true);
    try {
      const response = await supabase.functions.invoke('generate-analytics-insights', {
        body: { analyticsData: data }
      });

      if (response.error) throw response.error;
      setAiInsights(response.data?.insights || []);
    } catch (err) {
      console.error('Failed to generate AI insights:', err);
      // Fallback insights with safe message
      setAiInsights([
        {
          title: 'Brak wystarczających danych',
          description: 'Dodaj więcej kontaktów aby otrzymać spersonalizowane insights.',
          type: 'warning'
        }
      ]);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  return { data, aiInsights, isLoading, isLoadingInsights, error, generateAIInsights };
}

// Helper functions
function generateTimeline(
  contacts: any[], 
  consultations: any[], 
  tasks: any[],
  startDate: Date,
  endDate: Date,
  dateRange: DateRangeValue
): TimelineDataPoint[] {
  let intervals: Date[];
  let formatStr: string;

  if (dateRange === '7d') {
    intervals = eachDayOfInterval({ start: startDate, end: endDate });
    formatStr = 'dd.MM';
  } else if (dateRange === '30d') {
    intervals = eachDayOfInterval({ start: startDate, end: endDate }).filter((_, i) => i % 3 === 0);
    formatStr = 'dd.MM';
  } else if (dateRange === '90d') {
    intervals = eachWeekOfInterval({ start: startDate, end: endDate });
    formatStr = 'dd.MM';
  } else {
    intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    formatStr = 'MMM yy';
  }

  return intervals.map(intervalDate => {
    const nextInterval = new Date(intervalDate);
    if (dateRange === '7d' || dateRange === '30d') {
      nextInterval.setDate(nextInterval.getDate() + 1);
    } else if (dateRange === '90d') {
      nextInterval.setDate(nextInterval.getDate() + 7);
    } else {
      nextInterval.setMonth(nextInterval.getMonth() + 1);
    }

    const contactCount = contacts.filter(c => {
      const d = new Date(c.created_at);
      return d >= intervalDate && d < nextInterval;
    }).length;

    const meetingCount = consultations.filter(c => {
      const d = new Date(c.scheduled_at);
      return d >= intervalDate && d < nextInterval;
    }).length;

    const taskCount = tasks.filter(t => {
      const d = new Date(t.created_at);
      return d >= intervalDate && d < nextInterval;
    }).length;

    return {
      date: format(intervalDate, formatStr, { locale: pl }),
      contacts: contactCount,
      meetings: meetingCount,
      tasks: taskCount,
    };
  });
}

function groupByIndustry(contacts: any[]): IndustryDataPoint[] {
  const industryMap: Record<string, number> = {};
  
  contacts.forEach(c => {
    const industry = c.company || 'Inne';
    industryMap[industry] = (industryMap[industry] || 0) + 1;
  });

  return Object.entries(industryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function groupMeetingsByStatus(consultations: any[]): MeetingOutcomeDataPoint[] {
  const statusMap: Record<string, number> = {
    'scheduled': 0,
    'completed': 0,
    'cancelled': 0,
  };

  consultations.forEach(c => {
    const status = c.status || 'scheduled';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });

  const labels: Record<string, string> = {
    'scheduled': 'Zaplanowane',
    'completed': 'Zakończone',
    'cancelled': 'Anulowane',
  };

  return Object.entries(statusMap).map(([status, count]) => ({
    outcome: labels[status] || status,
    count,
  }));
}

function getTopCategories(needs: any[]): CategoryDataPoint[] {
  const categoryMap: Record<string, number> = {};

  needs.forEach(n => {
    const category = n.title?.split(' ')[0] || 'Inne';
    categoryMap[category] = (categoryMap[category] || 0) + 1;
  });

  return Object.entries(categoryMap)
    .map(([category, matches]) => ({ category, matches }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5);
}

interface GroupPolicy {
  id: string;
  refresh_days: number | null;
  include_in_health_stats: boolean | null;
}

interface ContactWithGroup {
  id: string;
  last_contact_date: string | null;
  primary_group_id: string | null;
}

function calculateNetworkHealthWithGroups(
  contacts: ContactWithGroup[], 
  groups: GroupPolicy[]
): NetworkHealth {
  // Create a map of group_id -> refresh_days
  const groupRefreshMap = new Map<string, number>();
  const groupIncludeMap = new Map<string, boolean>();
  
  groups.forEach(g => {
    groupRefreshMap.set(g.id, g.refresh_days ?? 90);
    groupIncludeMap.set(g.id, g.include_in_health_stats ?? true);
  });

  // Default refresh days for contacts without group
  const defaultRefreshDays = 90;
  
  // Filter contacts that should be included in health stats
  const includedContacts = contacts.filter(c => {
    if (!c.primary_group_id) return true; // Include ungrouped by default
    return groupIncludeMap.get(c.primary_group_id) !== false;
  });

  const total = includedContacts.length || 1;
  const now = new Date();
  
  let healthy = 0;
  let warning = 0;
  let critical = 0;

  includedContacts.forEach(contact => {
    const refreshDays = contact.primary_group_id 
      ? (groupRefreshMap.get(contact.primary_group_id) ?? defaultRefreshDays)
      : defaultRefreshDays;
    
    const lastContact = contact.last_contact_date 
      ? new Date(contact.last_contact_date) 
      : null;
    
    const daysSinceContact = lastContact 
      ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    // Healthy: less than refresh_days
    // Warning: refresh_days to 1.5x refresh_days
    // Critical: more than 1.5x refresh_days
    if (daysSinceContact < refreshDays) {
      healthy++;
    } else if (daysSinceContact < refreshDays * 1.5) {
      warning++;
    } else {
      critical++;
    }
  });

  return {
    healthy,
    healthyPercent: Math.round((healthy / total) * 100),
    warning,
    warningPercent: Math.round((warning / total) * 100),
    critical,
    criticalPercent: Math.round((critical / total) * 100),
  };
}
