import { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface FeatureFlagGateProps {
  flag: string;
  children: ReactNode;
  fallback: ReactNode;
}

export function FeatureFlagGate({ flag, children, fallback }: FeatureFlagGateProps) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
