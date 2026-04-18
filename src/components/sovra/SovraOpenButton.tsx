import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SovraOpenButtonProps {
  scopeType: 'contact' | 'project' | 'deal' | 'meeting';
  scopeId: string;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

/**
 * Sprint 06 — wstawiamy w nagłówkach kart domenowych.
 * Otwiera Sovrę z ustawionym scope (?context=...&id=...).
 */
export function SovraOpenButton({
  scopeType,
  scopeId,
  label = 'Zapytaj Sovrę',
  variant = 'outline',
  size = 'sm',
  className,
}: SovraOpenButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => navigate(`/sovra?context=${scopeType}&id=${scopeId}`)}
      className={cn('gap-1.5', className)}
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </Button>
  );
}
