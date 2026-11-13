import { useConfirmState, resolveConfirm } from '@/lib/dialogs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { tx } from '@/lib/i18n';

export function ConfirmHost() {
  const s = useConfirmState();
  return (
    <AlertDialog open={!!s} onOpenChange={(o) => { if (!o) resolveConfirm(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{s?.destructive ? tx('¿Seguro?') : tx('Confirmar')}</AlertDialogTitle>
          <AlertDialogDescription>{s?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tx("Cancelar")}</AlertDialogCancel>
          <AlertDialogAction variant={s?.destructive ? 'destructive' : 'default'} onClick={() => resolveConfirm(true)}>{tx("Aceptar")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
