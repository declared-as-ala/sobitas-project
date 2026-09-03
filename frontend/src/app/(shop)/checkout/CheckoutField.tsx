import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleAlert } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

export function CheckoutFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm leading-5 text-destructive">
    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{message}
  </p>;
}

export function CheckoutField({ label, icon: Icon, error, ...input }: ComponentProps<typeof Input> & { id: string; label: string; icon: LucideIcon; error?: string }) {
  return <div className="space-y-1.5" data-checkout-field={input.id}>
    <Label htmlFor={input.id} className="flex items-center gap-2 text-sm font-semibold leading-5 text-ink-1">
      <Icon className="h-4 w-4 text-ink-3" aria-hidden="true" />
      {label}{input.required ? <span className="text-ink-3" aria-hidden="true">*</span> : <span className="font-normal text-ink-3">(optionnel)</span>}
    </Label>
    <Input {...input} aria-invalid={!!error} aria-describedby={error ? `${input.id}-error` : undefined}
      className={`h-12 rounded-xl bg-canvas !text-base text-ink-1 shadow-none placeholder:text-ink-3 focus-visible:ring-offset-0 ${error ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive' : 'border-rule-strong focus-visible:border-brand focus-visible:ring-focus'}`} />
    <CheckoutFieldError id={input.id} message={error} />
  </div>;
}
