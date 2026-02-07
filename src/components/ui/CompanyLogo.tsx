import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useCompanyLogo } from '@/hooks/useCompanyLogo';

interface CompanyLogoProps {
  companyName: string | null;
  website?: string | null;
  /** Direct logo URL (e.g. from DB), takes priority over Clearbit lookup */
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
} as const;

export function CompanyLogo({
  companyName,
  website,
  logoUrl: overrideLogoUrl,
  size = 'md',
  className,
}: CompanyLogoProps) {
  const { logoUrl, isLoading, initials } = useCompanyLogo(
    companyName,
    website,
    overrideLogoUrl,
  );
  const [imgError, setImgError] = useState(false);

  const sizeClass = sizeClasses[size];

  // State 1: Logo available and no error
  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={companyName || 'Logo firmy'}
        className={cn(
          sizeClass,
          'rounded-md object-contain bg-background border border-border flex-shrink-0',
          className,
        )}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  // State 2: Loading
  if (isLoading) {
    return (
      <div
        className={cn(
          sizeClass,
          'rounded-md animate-pulse bg-muted flex-shrink-0',
          className,
        )}
      />
    );
  }

  // State 3: Fallback — initials
  return (
    <div
      className={cn(
        sizeClass,
        'rounded-md bg-muted flex items-center justify-center font-medium text-muted-foreground flex-shrink-0',
        className,
      )}
    >
      {initials}
    </div>
  );
}
