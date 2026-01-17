import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  FileText, 
  Table, 
  Brain, 
  Lightbulb, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Users,
  Target,
  CalendarCheck,
  Handshake,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalytics, AIInsight } from '@/hooks/useAnalytics';
import { exportToPDF, exportToExcel } from '@/utils/exportReports';
import { AnalyticsCardsGridSkeleton } from '@/components/analytics/AnalyticsCardSkeleton';
import { ChartsGridSkeleton } from '@/components/analytics/ChartSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const dateRangeLabels: Record<string, string> = {
  '7d': 'Ostatnie 7 dni',
  '30d': 'Ostatnie 30 dni',
  '90d': 'Ostatnie 90 dni',
  '1y': 'Ostatni rok',
  'all': 'Cały czas',
};

export default function Analytics() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const { data, aiInsights, isLoading, isLoadingInsights, generateAIInsights } = useAnalytics(dateRange);

  useEffect(() => {
    if (data && aiInsights.length === 0) {
      generateAIInsights();
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analityka</h1>
            <p className="text-muted-foreground">Ładowanie danych...</p>
          </div>
        </div>
        <AnalyticsCardsGridSkeleton />
        <ChartsGridSkeleton />
        <ChartsGridSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={BarChart3}
          title="Brak danych analitycznych"
          description="Nie znaleziono danych do analizy. Dodaj kontakty i aktywności aby zobaczyć statystyki."
        />
      </div>
    );
  }

  const { metrics, activityTimeline, contactsByIndustry, meetingOutcomes, topCategories, networkHealth } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header with date range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analityka</h1>
          <p className="text-muted-foreground">Przegląd aktywności i statystyki sieci kontaktów</p>
        </div>

        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Ostatnie 7 dni</SelectItem>
              <SelectItem value="30d">Ostatnie 30 dni</SelectItem>
              <SelectItem value="90d">Ostatnie 90 dni</SelectItem>
              <SelectItem value="1y">Ostatni rok</SelectItem>
              <SelectItem value="all">Cały czas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Łączna liczba kontaktów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalContacts}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {metrics.contactsGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={metrics.contactsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {metrics.contactsGrowth >= 0 ? '+' : ''}{metrics.contactsGrowth}%
              </span>{' '}
              vs poprzedni okres
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Aktywne potrzeby
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.activeNeeds}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.needsFulfillmentRate}% wskaźnik realizacji
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Liczba spotkań
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalMeetings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Średnio {metrics.avgMeetingsPerWeek} na tydzień
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Zrealizowane połączenia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.successfulMatches}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.matchSuccessRate}% sukcesu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Aktywność w czasie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityTimeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="contacts" stroke="#8b5cf6" name="Nowe kontakty" strokeWidth={2} />
                <Line type="monotone" dataKey="meetings" stroke="#3b82f6" name="Spotkania" strokeWidth={2} />
                <Line type="monotone" dataKey="tasks" stroke="#10b981" name="Zadania" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contacts by Industry */}
        <Card>
          <CardHeader>
            <CardTitle>Kontakty wg firm</CardTitle>
          </CardHeader>
          <CardContent>
            {contactsByIndustry.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={contactsByIndustry}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.slice(0, 15)}${name.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {contactsByIndustry.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Brak danych o firmach
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Outcomes */}
        <Card>
          <CardHeader>
            <CardTitle>Status spotkań</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={meetingOutcomes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="outcome" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" fill="#3b82f6" name="Liczba spotkań" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Najczęstsze kategorie potrzeb</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCategories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="matches" fill="#10b981" name="Liczba" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Brak danych o kategoriach
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Network Health */}
      <Card>
        <CardHeader>
          <CardTitle>Zdrowie sieci kontaktów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Relacje zdrowe (&lt;30 dni)</span>
                <span className="text-sm font-medium">{networkHealth.healthy} ({networkHealth.healthyPercent}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${networkHealth.healthyPercent}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Relacje ostrzeżenie (30-90 dni)</span>
                <span className="text-sm font-medium">{networkHealth.warning} ({networkHealth.warningPercent}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${networkHealth.warningPercent}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Relacje krytyczne (&gt;90 dni)</span>
                <span className="text-sm font-medium">{networkHealth.critical} ({networkHealth.criticalPercent}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${networkHealth.criticalPercent}%` }} 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Insights AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInsights ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {aiInsights.map((insight: AIInsight, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <Lightbulb className={`h-5 w-5 mt-0.5 ${
                    insight.type === 'positive' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              ))}
              {aiInsights.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Kliknij przycisk aby wygenerować insights</p>
                  <Button onClick={generateAIInsights} className="mt-2" size="sm">
                    <Brain className="mr-2 h-4 w-4" />
                    Generuj insights
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => exportToPDF(data, dateRangeLabels[dateRange])} size="lg">
              <FileText className="mr-2 h-4 w-4" />
              Eksportuj PDF
            </Button>

            <Button variant="outline" onClick={() => exportToExcel(data, dateRangeLabels[dateRange])} size="lg">
              <Table className="mr-2 h-4 w-4" />
              Eksportuj Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
