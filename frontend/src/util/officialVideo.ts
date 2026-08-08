/**
 * The official brand video attached to a product.
 *
 * ── THE ID IS VALIDATED HERE TOO, ON PURPOSE ──────────────────────────────────────────────
 * The backend importer already rejects anything that is not a YouTube id, and this file validates
 * it again before building a URL. That is not belt-and-braces for its own sake: this value becomes
 * an `<iframe src>` on a page that takes card payments, and the set of things that can write to a
 * JSON column over the life of a project only ever grows — an importer today, a CSV upload next
 * year, a hand-edited row when something breaks at 2am.
 *
 * The check is a whitelist, and the failure mode is "no video", never "a video from somewhere else".
 */

export type OfficialVideo = {
  youtube_id: string;
  title?: string | null;
  channel?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
};

/** YouTube ids are exactly 11 characters of URL-safe base64. Anything else is not an id. */
const ID = /^[A-Za-z0-9_-]{11}$/;

export function videoId(video: unknown): string | null {
  if (!video || typeof video !== 'object') return null;
  const raw = (video as OfficialVideo).youtube_id;
  return typeof raw === 'string' && ID.test(raw.trim()) ? raw.trim() : null;
}

/**
 * youtube-nocookie.com sets no tracking cookie until the visitor actually presses play. On a
 * storefront that is both the decent default and one fewer thing to declare in the cookie policy.
 */
export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Still images come from a cookieless host, so the thumbnail costs the visitor nothing. */
export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * A title we are willing to print.
 *
 * Falls back to the product name rather than showing a bare id, and never to an empty string —
 * an untitled link is an accessibility failure and a bad search result.
 */
export function videoTitle(video: OfficialVideo | null | undefined, productName: string): string {
  const title = (video?.title ?? '').trim();
  return title !== '' ? title : `${productName} — vidéo officielle`;
}

/**
 * `VideoObject` structured data.
 *
 * `uploadDate` is REQUIRED by Google for a video rich result, and we do not reliably know it — the
 * research pass records when WE verified the video, not when the brand published it. Emitting our
 * verification date as `uploadDate` would be inventing a fact to satisfy a validator, so the field
 * is omitted when unknown and the schema simply does not qualify for the rich result. A missing
 * rich result costs a thumbnail; a wrong date is a wrong statement about someone else's content.
 */
export function buildVideoObjectSchema(
  video: OfficialVideo | null | undefined,
  productName: string,
  pageUrl: string
): object | null {
  const id = videoId(video);
  if (!id || !video) return null;

  const schema: Record<string, unknown> = {
    '@type': 'VideoObject',
    name: videoTitle(video, productName),
    description: `Vidéo officielle ${video.channel ? `de ${video.channel} ` : ''}présentant ${productName}.`,
    thumbnailUrl: thumbnailUrl(id),
    embedUrl: embedUrl(id),
    contentUrl: watchUrl(id),
    mainEntityOfPage: pageUrl,
  };

  if (video.channel) {
    schema.publisher = { '@type': 'Organization', name: video.channel };
  }

  return schema;
}
