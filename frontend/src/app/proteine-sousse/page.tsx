import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Truck, ShieldCheck, CreditCard, Clock, Phone, ArrowRight } from 'lucide-react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import {
  buildBreadcrumbListSchema,
  buildWebPageSchema,
  buildLocalBusinessSchema,
  buildFAQPageSchemaFromQA,
  buildItemListSchema,
} from '@/util/structuredData';

// Evergreen local landing page — no backend dependency, so it always renders (a resilient,
// fully server-rendered target for the under-served "protéine Sousse" local keyword cluster).
const TITLE = 'Protéine à Sousse | Whey, Créatine & Compléments — Protein.tn';
const DESCRIPTION =
  'Achetez vos protéines, whey, créatine et compléments alimentaires à Sousse chez Protein.tn. Produits 100% authentiques, magasin à Sousse, livraison à Sousse, Tunis et partout en Tunisie — paiement à la livraison.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords:
    'protéine sousse, whey sousse, créatine sousse, compléments alimentaires sousse, magasin protéine sousse, nutrition sportive sousse, protein.tn sousse, protéine tunisie, whey tunisie',
  alternates: { canonical: buildCanonicalUrl('/proteine-sousse') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonicalUrl('/proteine-sousse'),
    type: 'website',
    siteName: 'Protéine Tunisie',
    locale: 'fr_FR',
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Protéine à Sousse — Protein.tn' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-banner.jpg'],
  },
};

// Internal links — every slug is a real 200 hub (same set used by the SiteNavigation schema + footer).
const CATEGORY_LINKS: Array<{ name: string; href: string; blurb: string }> = [
  { name: 'Whey protéine', href: '/whey-proteine', blurb: 'Isolate, concentrée et hydrolysée des grandes marques.' },
  { name: 'Créatine', href: '/creatine', blurb: 'Monohydrate & Creapure pour la force et la récupération.' },
  { name: 'Gainers & prise de masse', href: '/gainers-proteines', blurb: 'Prise de masse rapide, riches en calories.' },
  { name: 'Prise de masse', href: '/prise-de-masse', blurb: 'Le pack complet pour prendre du volume.' },
  { name: 'Perte de poids', href: '/perte-de-poids', blurb: 'Brûleurs, L-carnitine et protéines minceur.' },
  { name: 'Pre-workout', href: '/pre-workout', blurb: 'Énergie, focus et congestion avant l’entraînement.' },
];

const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'Où acheter de la protéine à Sousse ?',
    answer:
      'Protein.tn est spécialisé dans les protéines et compléments alimentaires à Sousse. Vous pouvez commander en ligne sur protein.tn et être livré à Sousse en 24 à 72 heures, ou nous contacter directement pour vos conseils et votre commande.',
  },
  {
    question: 'Vos produits sont-ils 100% authentiques ?',
    answer:
      'Oui. Nous distribuons uniquement des produits authentiques des grandes marques de nutrition sportive (Optimum Nutrition, BioTechUSA, Ostrovit et bien d’autres), avec des dates de péremption longues.',
  },
  {
    question: 'Livrez-vous en dehors de Sousse ?',
    answer:
      'Oui. En plus de Sousse, nous livrons à Tunis, Sfax, Monastir, Nabeul et partout en Tunisie. Le paiement à la livraison est disponible sur toutes les commandes.',
  },
  {
    question: 'Quelle protéine choisir pour débuter à Sousse ?',
    answer:
      'Pour débuter, une whey concentrée ou isolate est le meilleur choix : simple, efficace et polyvalente. Associez-la à de la créatine monohydrate pour la force. Notre équipe à Sousse peut vous conseiller selon votre objectif (prise de masse, sèche, performance).',
  },
];

export default function ProteineSoussePage() {
  const baseUrl = getBaseUrl();

  const webPageSchema = buildWebPageSchema(TITLE, '/proteine-sousse', baseUrl, { description: DESCRIPTION });
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Protéine à Sousse', url: '/proteine-sousse' }],
    baseUrl
  );
  const localBusinessSchema = buildLocalBusinessSchema(baseUrl);
  const faqSchema = buildFAQPageSchemaFromQA(FAQ);
  const itemListSchema = buildItemListSchema(
    CATEGORY_LINKS.map((c) => ({ name: c.name, url: c.href })),
    baseUrl,
    { name: 'Catégories de compléments — Sousse' }
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <Header />

      <main className="bg-white dark:bg-gray-950">
        {/* Hero */}
        <section className="border-b border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-900/40">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
            <nav aria-label="Fil d’Ariane" className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="hover:text-red-600">Accueil</Link>
              <span className="mx-1.5">/</span>
              <span className="text-gray-700 dark:text-gray-300">Protéine à Sousse</span>
            </nav>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Sousse · Tunisie
            </p>
            <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl md:text-5xl">
              Protéine à Sousse — Whey, Créatine & Compléments
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
              Protein.tn est votre spécialiste des <strong>protéines et compléments alimentaires à Sousse</strong>.
              Whey, créatine, gainers, BCAA et matériel de sport — 100% authentiques, au meilleur prix, avec
              livraison rapide à Sousse et partout en Tunisie.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-700"
              >
                Voir la boutique <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-gray-800 transition-colors hover:border-red-600 hover:text-red-600 dark:border-gray-700 dark:text-gray-200"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> Nous contacter
              </Link>
            </div>
          </div>
        </section>

        {/* Trust / local info */}
        <section className="mx-auto max-w-5xl px-4 py-10">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: '100% authentique', text: 'Produits officiels des grandes marques.' },
              { icon: Truck, title: 'Livraison 24–72h', text: 'À Sousse, Tunis et toute la Tunisie.' },
              { icon: CreditCard, title: 'Paiement à la livraison', text: 'Payez à la réception, en toute confiance.' },
              { icon: Clock, title: 'Conseil expert', text: 'Une équipe basée à Sousse pour vous guider.' },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <Icon className="h-6 w-6 text-red-600" aria-hidden="true" />
                <p className="mt-2 font-display text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                  {title}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Unique local copy */}
        <section className="mx-auto max-w-3xl px-4 pb-4">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
            Acheter ses protéines à Sousse en toute confiance
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
            <p>
              À Sousse, trouver de la <strong>vraie</strong> protéine à un prix juste n’est pas toujours simple.
              Protein.tn s’est construit une réputation locale sur trois promesses simples : des produits
              authentiques, des conseils honnêtes et une livraison fiable. Que vous cherchiez votre première
              boîte de whey, de la créatine monohydrate pour progresser en force, ou un gainer pour la prise de
              masse, vous commandez ici en quelques minutes.
            </p>
            <p>
              Notre catalogue couvre toutes les grandes marques de nutrition sportive et tous les objectifs :
              prise de masse, perte de poids, performance et récupération. Chaque produit est expédié depuis la
              Tunisie — pas d’attente de dédouanement, pas de mauvaise surprise. Et si vous hésitez, notre équipe
              à Sousse vous oriente vers le complément adapté à <em>votre</em> objectif.
            </p>
          </div>
        </section>

        {/* Category links (internal linking) */}
        <section className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
            Nos catégories les plus demandées à Sousse
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_LINKS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-500/40"
              >
                <span className="font-display text-lg font-bold uppercase tracking-wide text-gray-900 group-hover:text-red-600 dark:text-white">
                  {c.name}
                </span>
                <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">{c.blurb}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                  Découvrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/brands" className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline">
              Voir toutes les marques disponibles à Sousse <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Delivery / local */}
        <section className="border-y border-gray-100 bg-gray-50 py-10 dark:border-gray-900 dark:bg-gray-900/40">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
              Livraison à Sousse et partout en Tunisie
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
              Nous livrons à <strong>Sousse</strong> et dans toutes les villes de Tunisie (Tunis, Sfax, Monastir,
              Nabeul, Bizerte…) sous 24 à 72 heures. Le <strong>paiement à la livraison</strong> est disponible sur
              chaque commande : vous ne payez qu’à la réception de votre colis. Suivez votre commande à tout moment
              depuis votre compte.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
            Questions fréquentes — Protéine à Sousse
          </h2>
          <dl className="mt-6 divide-y divide-gray-100 dark:divide-gray-800">
            {FAQ.map((item) => (
              <div key={item.question} className="py-5">
                <dt className="font-display text-base font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                  {item.question}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 rounded-xl bg-red-600 px-6 py-8 text-center">
            <p className="font-display text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
              Prêt à commander vos protéines à Sousse ?
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-red-600 transition-transform hover:scale-[1.02]"
            >
              Parcourir la boutique <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
