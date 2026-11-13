import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/** Label + control + optional hint, consistent spacing everywhere. */
export function Field({ label, hint, children, className, htmlFor }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</Label>}
      {children}
      {hint && <div className="text-xs leading-relaxed text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Input with a unit suffix (g, %, °C …) — numbers right-aligned in mono. */
export function UnitInput({ unit, className, inputClassName, ...props }) {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <Input id={props.id || id} inputMode="decimal" className={cn('pr-10 text-right font-mono tabular', inputClassName)} {...props} />
      {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

/** Small "label: value" stat used inside cards and dialogs. */
export function Metric({ label, value, note, className, valueClassName }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 font-mono text-base tabular', valueClassName)}>{value}</div>
      {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
    </div>
  );
}

/** Section divider inside dialogs/cards. */
export function SectionLabel({ children, className, action }) {
  return (
    <div className={cn('mb-3 mt-1 flex items-center gap-3', className)}>
      <span className="font-brand text-[11px] uppercase tracking-[0.18em] text-gold-ink">{children}</span>
      <span className="h-px flex-1 bg-border" />
      {action}
    </div>
  );
}

/** Trusted, app-owned rich text from the legacy constants (contains <b>, <i>). */
export function Rich({ html, className, as: Tag = 'span' }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html || '' }} />;
}

/** Numeric UnitInput bound to live data: keeps the typed text (so "6." or "" survive)
 *  and reports the parsed number (or null when empty) on every keystroke. */
export function NumberField({ value, onValue, ...props }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(value == null ? '' : String(value)); }, [value, focused]);
  return (
    <UnitInput {...props} value={draft}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onChange={(e) => { const t = e.target.value.replace(',', '.'); setDraft(t); if (t === '' || !isNaN(+t)) onValue(t === '' ? null : +t); }} />
  );
}
