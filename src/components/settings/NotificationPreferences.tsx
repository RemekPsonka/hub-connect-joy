import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Calendar, AlertCircle, Link, HeartCrack, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NotificationPreferences {
  id?: string;
  consultation_reminders: boolean;
  task_overdue: boolean;
  new_matches: boolean;
  relationship_decay: boolean;
  daily_serendipity: boolean;
}

const defaultPreferences: NotificationPreferences = {
  consultation_reminders: true,
  task_overdue: true,
  new_matches: true,
  relationship_decay: true,
  daily_serendipity: true
};

export const NotificationPreferences = () => {
  const { director } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!director?.id) return;

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('director_id', director.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            id: data.id,
            consultation_reminders: data.consultation_reminders ?? true,
            task_overdue: data.task_overdue ?? true,
            new_matches: data.new_matches ?? true,
            relationship_decay: data.relationship_decay ?? true,
            daily_serendipity: data.daily_serendipity ?? true,
          });
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [director?.id]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!director?.id || !director?.tenant_id) return;

    setIsSaving(true);
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          director_id: director.id,
          tenant_id: director.tenant_id,
          ...newPreferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'director_id'
        });

      if (error) throw error;

      toast.success('Preferencje zapisane');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Nie udało się zapisać preferencji');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Ustawienia powiadomień
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const preferenceItems = [
    {
      key: 'consultation_reminders' as const,
      icon: Calendar,
      label: 'Przypomnienia o spotkaniach',
      description: '24h przed zaplanowanym spotkaniem',
      iconColor: 'text-blue-500'
    },
    {
      key: 'task_overdue' as const,
      icon: AlertCircle,
      label: 'Zaległe zadania',
      description: 'Powiadomienia o przekroczonych terminach',
      iconColor: 'text-red-500'
    },
    {
      key: 'new_matches' as const,
      icon: Link,
      label: 'Nowe dopasowania',
      description: 'Przy dopasowaniu potrzeb i ofert >80%',
      iconColor: 'text-green-500'
    },
    {
      key: 'relationship_decay' as const,
      icon: HeartCrack,
      label: 'Zaniedbane relacje',
      description: 'Brak kontaktu >90 dni',
      iconColor: 'text-orange-500'
    },
    {
      key: 'daily_serendipity' as const,
      icon: Lightbulb,
      label: 'Odkrycie Dnia',
      description: 'Codzienne nieoczywiste rekomendacje AI',
      iconColor: 'text-amber-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Ustawienia powiadomień
        </CardTitle>
        <CardDescription>
          Wybierz, o czym chcesz być informowany
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preferenceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.key}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${item.iconColor}`} />
                <div>
                  <Label htmlFor={item.key} className="font-medium cursor-pointer">
                    {item.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
              <Switch
                id={item.key}
                checked={preferences[item.key]}
                onCheckedChange={(checked) => updatePreference(item.key, checked)}
                disabled={isSaving}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
