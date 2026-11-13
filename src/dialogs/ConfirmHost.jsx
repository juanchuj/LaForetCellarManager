import { useConfirmState, resolveConfirm } from '@/lib/dialogs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function ConfirmHost() {
  const s = useConfirmState();
  return (
    <AlertDialog open={!!s} onOpenChange={(o) => { if (!o) resolveConfirm(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{s?.destructive ? '¿Seguro?' : 'Confirmar'}</AlertDialogTitle>
          <AlertDialogDescription>{s?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={s?.destructive ? 'destructive' : 'default'} onClick={() => resolveConfirm(true)}>Aceptar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
