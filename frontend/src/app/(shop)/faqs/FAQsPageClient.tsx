import { PageHeader } from '@/app/components/PageHeader';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { HelpCircle } from 'lucide-react';
import type { FAQ } from '@/types';

interface FAQsPageClientProps {
  faqs: FAQ[];
}

export function FAQsPageClient({ faqs }: FAQsPageClientProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col items-center text-center mb-10 sm:mb-12">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            <HelpCircle className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <PageHeader
            align="center"
            kicker="Aide"
            title="Questions Fréquentes"
            subtitle="Trouvez les réponses à vos questions sur nos produits, commandes et livraisons"
          />
        </div>

        {faqs.length === 0 ? (
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Aucune FAQ disponible pour le moment.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 sm:px-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={`item-${faq.id}`}
                  className="border-gray-100 dark:border-gray-800"
                >
                  <AccordionTrigger className="py-5 text-left text-base font-medium text-gray-900 dark:text-white hover:no-underline hover:text-red-600 dark:hover:text-red-400 [&>svg]:text-red-600 dark:[&>svg]:text-red-400">
                    {faq.question || 'Question'}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                    {faq.reponse || 'Réponse non disponible'}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </main>
<ScrollToTop />
    </div>
  );
}
