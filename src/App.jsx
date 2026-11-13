import { useRoute } from '@/lib/router';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileTopbar } from '@/components/mobile-topbar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Dashboard } from '@/views/Dashboard';
import { Timeline } from '@/views/Timeline';
import { Batches } from '@/views/Batches';
import { BatchDetail } from '@/views/batch/BatchDetail';
import { DialogHost } from '@/dialogs/DialogHost';
import { Library } from '@/views/Library';
import { Analytics } from '@/views/Analytics';
import { Defects } from '@/views/Defects';
import { Types, TypeEditor } from '@/views/Types';
import { Ingredients } from '@/views/Ingredients';

function Page() {
  const { section, id } = useRoute();
  if (section === 'panel') return <Dashboard />;
  if (section === 'cava') return <Timeline />;
  if (section === 'lotes') return id ? <BatchDetail id={id} /> : <Batches />;
  if (section === 'tipos') return id ? <TypeEditor id={id} /> : <Types />;
  if (section === 'ingredientes') return <Ingredients />;
  if (section === 'biblioteca') return <Library />;
  if (section === 'analytics') return <Analytics />;
  if (section === 'defectos') return <Defects />;
  return <Dashboard />;
}

export default function App() {
  const { path } = useRoute();
  return (
    <TooltipProvider>
      <div className="flex min-h-svh">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <MobileTopbar />
          <main key={path} className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-8 animate-in fade-in-0 duration-300 sm:px-6 lg:px-10 lg:pt-10">
            <Page />
          </main>
        </div>
      </div>
      <DialogHost />
      <Toaster />
    </TooltipProvider>
  );
}
