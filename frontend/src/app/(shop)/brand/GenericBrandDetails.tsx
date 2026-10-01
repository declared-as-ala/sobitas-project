import type { buildGenericBrandTemplate } from '@/util/brandTemplate';

export function GenericBrandDetails({ template }: { template: ReturnType<typeof buildGenericBrandTemplate> }) {
  if (!template.faqs.length) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-label="Conseil d’achat" className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6">
        <h2 className="font-display text-xl font-extrabold uppercase text-ink-1">{template.howToChooseTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{template.howToChooseBody}</p>
      </section>
      <section aria-label="Questions fréquentes" className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6">
        <h2 className="font-display text-xl font-extrabold uppercase text-ink-1">Questions fréquentes</h2>
        <dl className="mt-3 space-y-4">
          {template.faqs.map(({ question, answer }) => (
            <div key={question}>
              <dt className="text-sm font-semibold text-ink-1">{question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-2">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
