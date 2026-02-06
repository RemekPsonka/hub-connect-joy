import { cn } from '@/lib/utils';

interface SovraAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
};

export function SovraAvatar({ size = 'sm', className }: SovraAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0',
        sizeMap[size],
        className
      )}
    >
      S
    </div>
  );
}
