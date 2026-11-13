import { BookOpenText, ChartGantt, Cloud, CloudOff, ChartLine, LayoutDashboard, Library, Package, ShieldAlert, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDB, core } from '@/lib/store';
import { openDialog } from '@/lib/dialogs';
import { useRoute } from '@/lib/router';

export const APP_VERSION = 'v5.2.1';

export const NAV = [
  { key: 'panel', href: '/', label: 'Panel', icon: LayoutDashboard, count: (db) => db.batches.filter((b) => b.status === 'in_progress').length },
  { key: 'cava', href: '/cava', label: 'Vista de cava', icon: ChartGantt },
  { key: 'lotes', href: '/lotes', label: 'Lotes', icon: Package, count: (db) => db.batches.length },
  { key: 'tipos', href: '/tipos', label: 'Tipos', icon: BookOpenText, count: (db) => db.types.length },
  { key: 'ingredientes', href: '/ingredientes', label: 'Ingredientes', icon: Wheat, count: (db) => db.ingredients.length },
  { key: 'biblioteca', href: '/biblioteca', label: 'Biblioteca', icon: Library },
  { key: 'analytics', href: '/analytics', label: 'Analytics', icon: ChartLine },
  { key: 'defectos', href: '/defectos', label: 'Defectos', icon: ShieldAlert },
];

export function SidebarContent({ onNavigate }) {
  const db = useDB();
  const { section } = useRoute();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <img src="./icons/logo.png" alt="La Forêt Madurados" className="mx-auto w-[148px] drop-shadow-[0_4px_10px_rgba(45,41,38,.18)]" />
        <div className="mt-3.5 text-center font-brand text-[13px] uppercase tracking-[0.28em] text-foreground/85">Cellar Manager</div>
        <div className="mt-1.5 flex justify-center">
          <span className="rounded-full border border-sidebar-border bg-background/60 px-2 py-px font-mono text-[10px] text-muted-foreground">{APP_VERSION}</span>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Principal">
        {NAV.map((item) => {
          const active = section === item.key || (item.key === 'panel' && section === 'panel');
          const Icon = item.icon;
          const n = item.count?.(db);
          return (
            <a
              key={item.key}
              href={`#${item.href}`}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-foreground',
                active && 'bg-card text-foreground shadow-xs ring-1 ring-sidebar-border'
              )}
            >
              <Icon className={cn('size-4 text-muted-foreground group-hover:text-foreground', active && 'text-gold-ink')} />
              <span className="flex-1">{item.label}</span>
              {n != null && <span className="font-mono text-[11px] tabular text-muted-foreground">{n}</span>}
            </a>
          );
        })}
      </nav>
      <div className="m-3 grid gap-2">
        <SyncButton />
      </div>
    </div>
  );
}

function SyncButton() {
  useDB();
  const { handle, status } = core.getCloud();
  const tone = !handle ? 'text-muted-foreground' : status === 'error' ? 'text-danger' : status === 'denied' ? 'text-warning' : 'text-success';
  const label = !handle ? 'iCloud sin vincular' : status === 'error' ? 'iCloud: error al guardar' : status === 'denied' ? 'iCloud: falta permiso' : 'iCloud sincronizado';
  return (
    <button onClick={() => openDialog('sync')} className="flex h-9 items-center gap-2 rounded-md border border-sidebar-border bg-background/50 px-3 text-xs font-medium transition-colors hover:bg-background">
      {handle ? <Cloud className={cn('size-4', tone)} /> : <CloudOff className={cn('size-4', tone)} />}
      <span className="flex-1 text-left">{label}</span>
      <span className={cn('size-1.5 rounded-full', handle && status !== 'error' && status !== 'denied' ? 'bg-success' : handle ? 'bg-danger' : 'bg-muted-foreground/40')} />
    </button>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 self-stretch border-r border-sidebar-border bg-sidebar lg:block">
      <div className="sticky top-0 h-svh overflow-y-auto"><SidebarContent /></div>
    </aside>
  );
}
