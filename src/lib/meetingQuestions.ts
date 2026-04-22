import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, AlertOctagon } from 'lucide-react';

export type EscalationLevel = 'normal' | 'notice' | 'warning' | 'critical';

export function getEscalationLevel(askCount: number): EscalationLevel {
  if (askCount >= 7) return 'critical';
  if (askCount >= 5) return 'warning';
  if (askCount >= 3) return 'notice';
  return 'normal';
}

export function getEscalationLabel(askCount: number): string {
  const level = getEscalationLevel(askCount);
  const base = `zadane ${askCount}×`;
  switch (level) {
    case 'critical':
      return `${base} · rozważ porzucenie`;
    case 'warning':
      return `${base} · powtarza się`;
    case 'notice':
      return `${base} · warto odpowiedzieć`;
    case 'normal':
      return base;
  }
}

export function getEscalationClasses(askCount: number): string {
  const level = getEscalationLevel(askCount);
  switch (level) {
    case 'critical':
      return 'text-red-600 font-medium';
    case 'warning':
      return 'text-orange-600 font-medium';
    case 'notice':
      return 'text-amber-600';
    case 'normal':
      return 'text-muted-foreground';
  }
}

export function getEscalationIcon(askCount: number): LucideIcon | null {
  const level = getEscalationLevel(askCount);
  if (level === 'critical') return AlertOctagon;
  if (level === 'warning') return AlertTriangle;
  return null;
}