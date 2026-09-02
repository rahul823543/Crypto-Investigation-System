import { cn } from '@/lib/utils';

interface PageFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function PageFrame({ children, className }: PageFrameProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-6 py-6 animate-fade-in',
        className
      )}
    >
      {children}
    </div>
  );
}
