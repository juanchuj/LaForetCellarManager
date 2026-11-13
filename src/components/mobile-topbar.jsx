import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/app-sidebar';
import { tx } from '@/lib/i18n';

export function MobileTopbar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tx("Abrir menú")}><Menu /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">{tx("Menú")}</SheetTitle>
          <SheetDescription className="sr-only">{tx("Navegación principal")}</SheetDescription>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <img src="./icons/logo.png" alt="" className="h-8" />
      <span className="font-brand text-xs uppercase tracking-[0.24em]">Cellar Manager</span>
    </div>
  );
}
