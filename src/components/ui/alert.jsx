import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      danger: 'border-danger/30 bg-danger-soft/60 text-danger [&>div]:text-danger/90',
      warning: 'border-warning/30 bg-warning-soft/60 text-warning [&>div]:text-warning/90',
      success: 'border-success/30 bg-success-soft/60 text-success [&>div]:text-success/90',
      info: 'border-info/30 bg-info-soft/60 text-info [&>div]:text-info/90',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({ className, variant, ...props }) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }) {
  return <div data-slot="alert-title" className={cn('col-start-2 line-clamp-2 min-h-4 font-medium tracking-tight', className)} {...props} />;
}
function AlertDescription({ className, ...props }) {
  return <div data-slot="alert-description" className={cn('col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed', className)} {...props} />;
}
export { Alert, AlertTitle, AlertDescription };
