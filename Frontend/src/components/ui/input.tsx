import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-cyber-border bg-cyber-surface px-3 py-2 text-sm text-cyber-text font-mono',
          'placeholder:text-cyber-text-muted',
          'focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/30 focus:shadow-[0_0_10px_rgba(0,240,255,0.1)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
