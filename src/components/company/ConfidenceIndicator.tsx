import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
}

export function ConfidenceIndicator({ 
  score, 
  size = 'sm', 
  showLabel = true,
  showIcon = true 
}: ConfidenceIndicatorProps) {
  const getColor = () => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    if (score >= 0.3) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    if (score >= 0.3) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLabel = () => {
    if (score >= 0.7) return 'Wysoka pewność';
    if (score >= 0.5) return 'Średnia pewność';
    if (score >= 0.3) return 'Niska pewność';
    return 'Bardzo niska pewność';
  };

  const getIcon = () => {
    if (score >= 0.7) return <CheckCircle className={cn('shrink-0', sizeClasses.icon)} />;
    if (score >= 0.5) return <AlertCircle className={cn('shrink-0', sizeClasses.icon)} />;
    return <HelpCircle className={cn('shrink-0', sizeClasses.icon)} />;
  };

  const sizeClasses = {
    dot: size === 'lg' ? 'w-3 h-3' : size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2',
    text: size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[10px]',
    icon: size === 'lg' ? 'h-4 w-4' : size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3',
    gap: size === 'lg' ? 'gap-2' : size === 'md' ? 'gap-1.5' : 'gap-1',
  };

  return (
    <div className={cn('flex items-center', sizeClasses.gap, getTextColor())}>
      {showIcon ? (
        getIcon()
      ) : (
        <div className={cn('rounded-full shrink-0', getColor(), sizeClasses.dot)} />
      )}
      {showLabel && (
        <span className={cn('text-muted-foreground', sizeClasses.text)}>
          {getLabel()} ({(score * 100).toFixed(0)}%)
        </span>
      )}
    </div>
  );
}

// Simple dot indicator without label
export function ConfidenceDot({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = () => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    if (score >= 0.3) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return <div className={cn('rounded-full shrink-0', getColor(), sizeClasses[size])} />;
}
