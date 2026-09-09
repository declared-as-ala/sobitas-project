/**
 * The identity-document upload envelope: what the browser will send and what the server accepts.
 *
 * ── WHY THIS IS ITS OWN MODULE ────────────────────────────────────────────────────────────
 * Three parties need this rule — the upload tile, the live client and the stub — and the first
 * arrangement put it in `affiliateProgram.ts`, which the stub already imports FROM. That made a
 * value cycle: A imports the stub for the swap, the stub imports A for the limits. ES modules
 * survive that only because of hoisting order, and "works because of evaluation order" is a bug
 * waiting for someone to move a `const` above a function. A leaf both sides import has no order
 * to get wrong.
 *
 * `affiliateProgram.ts` re-exports everything here, so callers still have one import.
 */

/**
 * 8 MB. A modern phone camera produces 2–5 MB, so this leaves headroom without accepting a RAW
 * file over a Tunisian mobile connection.
 */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

/**
 * HEIC is listed because it is the iPhone default. Rejecting it would turn away every applicant
 * who has never opened Settings to change it — which is most of them.
 */
export const ACCEPTED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/** For the `accept` attribute. Kept beside the list so the two cannot drift. */
export const DOCUMENT_ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/*';

/**
 * The one place a chosen file is judged, so the tile, the stub and the live client cannot
 * disagree about what is acceptable. Returns a French sentence, or `undefined` when the file is
 * fine.
 *
 * The extension check is a fallback, not a duplicate: some Android browsers hand back an empty
 * `file.type` for an image picked from the gallery, and rejecting those would be a defect that
 * only ever reproduces on somebody else's phone.
 *
 * The floor matters as much as the ceiling. A 4 KB image is a thumbnail or a screenshot of a
 * thumbnail; accepting it means an administrator opens an unreadable document days later and the
 * applicant has to be called back for a photo they thought they had already sent.
 */
export function documentFileError(file: File): string | undefined {
  const typeOk =
    (ACCEPTED_DOCUMENT_TYPES as readonly string[]).includes(file.type) ||
    (!file.type && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));
  if (!typeOk) return 'Envoyez une photo au format JPG, PNG ou HEIC.';
  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'La photo dépasse 8 Mo. Reprenez-la, ou choisissez une image plus légère.';
  }
  if (file.size < 20 * 1024) {
    return 'Cette image est trop petite pour être lisible. Reprenez la photo de plus près.';
  }
  return undefined;
}

/** "2,4 Mo" — French decimal comma, because the whole surface is French. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}
