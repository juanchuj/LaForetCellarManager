import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

function AlertDialog(props) { return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />; }
function AlertDialogContent({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#2D2926]/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn('fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0', className)}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}
function AlertDialogHeader({ className, ...props }) { return <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />; }
function AlertDialogFooter({ className, ...props }) { return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />; }
function AlertDialogTitle({ className, ...props }) { return <AlertDialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />; }
function AlertDialogDescription({ className, ...props }) { return <AlertDialogPrimitive.Description className={cn('whitespace-pre-line text-sm text-muted-foreground', className)} {...props} />; }
function AlertDialogAction({ className, variant, ...props }) { return <AlertDialogPrimitive.Action className={cn(buttonVariants({ variant }), className)} {...props} />; }
function AlertDialogCancel({ className, ...props }) { return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />; }

export { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
