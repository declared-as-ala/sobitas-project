import type { Metadata } from 'next';
import AvisClient from './AvisClient';

// Private, per-order review link — never indexed.
export const metadata: Metadata = {
  title: 'Donnez votre avis',
  description: 'Notez les produits de votre commande.',
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

/** A whole, positive number from a query param, or null. `?p=12abc` and `?note=4.5` are not. */
function wholeNumberParam(value: string | string[] | undefined): number | null {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!raw || !/^\d{1,10}$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/*
  The review email links each star to `/avis/{ref}?p={product_id}&note={1-5}`. Both are read here
  and handed down as plain props; AvisClient only PRESELECTS with them — a link a mail scanner
  prefetches must never publish anything. Invalid values become null and the page behaves exactly
  as a bare `/avis/{ref}`.
*/
export default async function AvisPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const productId = wholeNumberParam(query.p);
  const note = wholeNumberParam(query.note);
  return (
    <AvisClient
      token={token}
      preselectProductId={productId}
      preselectStars={note != null && note >= 1 && note <= 5 ? note : null}
    />
  );
}
