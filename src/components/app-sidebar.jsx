import { BookOpenText, ChartGantt, ChartLine, ExternalLink, LayoutDashboard, Library, Package, ShieldAlert, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDB } from '@/lib/store';
import { useRoute } from '@/lib/router';
import { LEGACY_URL } from '@/lib/notify';
import { Badge } from '@/components/ui/badge';

export const APP_VERSION = 'v5.0.0';

export const NAV = [
  { key: 'panel', href: '/', label: 'Panel', icon: LayoutDashboard, count: (db) => db.batches.filter((b) => b.status === 'in_progress').length },
  { key: 'cava', href: '/cava', label: 'Vista de cava', icon: ChartGantt },
  { key: 'lotes', href: '/lotes', label: 'Lotes', icon: Package, count: (db) => db.batches.length },
  { key: 'tipos', href: '/tipos', label: 'Tipos', icon: BookOpenText, count: (db) => db.types.length, phase: 2 },
  { key: 'ingredientes', href: '/ingredientes', label: 'Ingredientes', icon: Wheat, count: (db) => db.ingredients.length, phase: 2 },
  { key: 'biblioteca', href: '/biblioteca', label: 'Biblioteca', icon: Library, phase: 3 },
  { key: 'analytics', href: '/analytics', label: 'Analytics', icon: ChartLine, phase: 3 },
  { key: 'defectos', href: '/defectos', label: 'Defectos', icon: ShieldAlert, phase: 3 },
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
              {item.phase && !n && <span className="text-[10px] font-normal text-muted-foreground">fase {item.phase}</span>}
              {n != null && <span className="font-mono text-[11px] tabular text-muted-foreground">{n}</span>}
            </a>
          );
        })}
      </nav>
      <div className="m-3 rounded-lg border border-sidebar-border bg-background/50 p-3 text-xs">
        <div className="flex items-center gap-2 font-medium"><Badge variant="gold" className="px-1.5 py-0 text-[10px]">Vista previa</Badge> v5 · fase 1</div>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">Sync iCloud, recetas y registros siguen en v4.4.3 con los mismos datos.</p>
        <a href={LEGACY_URL} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 font-medium text-gold-ink hover:underline">
          Abrir v4.4.3 <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 self-stretch border-r border-sidebar-border bg-sidebar lg:block">
      <div className="sticky top-0 h-svh overflow-y-auto"><SidebarContent /></div>
    </aside>
  );
}
