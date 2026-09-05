import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  pill?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', leftIcon, rightIcon, error, pill = false, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div
          className={cn(
            'flex items-center bg-white border border-slate-200 transition-all duration-200 focus-within:border-[#4F46E5] focus-within:ring-4 focus-within:ring-purple-100',
            pill ? 'rounded-full px-4 py-1.5' : 'rounded-2xl px-3.5 py-2',
            error && 'border-red-300 focus-within:border-red-500 focus-within:ring-red-100',
            className
          )}
        >
          {leftIcon && (
            <div className="text-[#94A3B8] mr-2.5 flex items-center shrink-0">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className="w-full bg-transparent border-none text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 font-mono disabled:opacity-50"
            {...props}
          />
          {rightIcon && (
            <div className="text-[#94A3B8] ml-2.5 flex items-center shrink-0">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500 pl-3 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
