import { Construction, ExternalLink } from 'lucide-react';
import { LEGACY_URL } from '@/lib/notify';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export function Placeholder({ item }) {
  return (
    <>
      <PageHeader eyebrow={`Fase ${item.phase} de v5`} title={item.label} />
      <EmptyState
        icon={Construction}
        title="En construcción"
        action={<Button asChild variant="outline"><a href={LEGACY_URL} target="_blank" rel="noopener">Abrir {item.label} en v4.4.3 <ExternalLink /></a></Button>}
      >
        Esta sección se rehace con los nuevos componentes en la fase {item.phase}. Mientras tanto seguí usándola en v4.4.3:
        lee y escribe los mismos datos de este navegador, y esta vista se actualiza sola.
      </EmptyState>
    </>
  );
}
