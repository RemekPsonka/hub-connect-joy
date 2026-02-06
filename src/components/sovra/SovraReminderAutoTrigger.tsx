import { useEffect, useRef } from 'react';
import { useTriggerReminders } from '@/hooks/useSovraReminders';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'sovra-reminder-last-trigger';
const DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Silent auto-trigger on login. No UI, no toast — just refreshes reminder data.
 */
export function SovraReminderAutoTrigger() {
  const { director } = useAuth();
  const trigger = useTriggerReminders();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!director?.id || hasTriggered.current) return;

    const lastTrigger = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (lastTrigger && now - Number(lastTrigger) < DEBOUNCE_MS) {
      return; // Too recent — skip
    }

    hasTriggered.current = true;
    localStorage.setItem(STORAGE_KEY, String(now));
    trigger.mutate(); // Silent — no toast in this hook by default on trigger
  }, [director?.id]);

  return null;
}
