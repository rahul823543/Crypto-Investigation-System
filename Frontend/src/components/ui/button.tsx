import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 hover:bg-cyber-cyan/25 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]',
        primary:
          'bg-cyber-cyan text-cyber-base font-semibold hover:bg-cyber-cyan/90 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]',
        destructive:
          'bg-cyber-red/15 text-cyber-red border border-cyber-red/30 hover:bg-cyber-red/25 hover:shadow-[0_0_15px_rgba(255,0,64,0.2)]',
        outline:
          'border border-cyber-border text-cyber-text-dim hover:bg-cyber-surface-2 hover:text-cyber-text hover:border-cyber-cyan/30',
        ghost:
          'text-cyber-text-dim hover:bg-cyber-surface-2 hover:text-cyber-text',
        link:
          'text-cyber-cyan underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
