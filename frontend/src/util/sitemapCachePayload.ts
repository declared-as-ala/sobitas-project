import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';

import type { SectionedSitemapEntry } from './sitemapSources';

const compress = promisify(gzip);
const decompress = promisify(gunzip);
export const DATA_CACHE_MAX_BYTES = 2 * 1024 * 1024;
export const DATA_CACHE_STOP_BYTES = Math.floor(DATA_CACHE_MAX_BYTES * 0.9);

/**
 * Next 15 measures JSON.stringify(FETCH envelope).length, including the nested JSON body.
 * Keep the existing conservative +128 envelope allowance.
 * For the ASCII base64 payload this is also a byte count; it overestimates Next's measurement.
 */
export function dataCacheItemBytes(value: unknown): number {
  return JSON.stringify(JSON.stringify(value)).length + 128;
}

export function assertSitemapCacheSize(bytes: number): void {
  if (bytes >= DATA_CACHE_STOP_BYTES) {
    throw new Error(
      `[sitemap] CACHE CAPACITY: ${bytes} bytes; headroom ${DATA_CACHE_MAX_BYTES - bytes} bytes ` +
      `to the ${DATA_CACHE_MAX_BYTES}-byte ceiling; guard ${DATA_CACHE_STOP_BYTES} bytes (90%). ` +
      'Refusing this snapshot BEFORE unstable_cache can silently discard it. ' +
      'Move to a larger persistent cache handler or versioned snapshot chunks.'
    );
  }
}

/** Lossless storage encoding only: the source list, ordering and XML renderer are unchanged. */
export async function encodeSitemapCache(entries: SectionedSitemapEntry[]): Promise<string> {
  const payload = (await compress(JSON.stringify(entries))).toString('base64');
  const bytes = dataCacheItemBytes(payload);
  console.log(
    `[sitemap] cache: ${entries.length} entries; raw ${dataCacheItemBytes(entries)} bytes; ` +
    `gzip/base64 ${bytes} bytes; headroom ${DATA_CACHE_MAX_BYTES - bytes} bytes ` +
    `to ${DATA_CACHE_MAX_BYTES}; guard headroom ${DATA_CACHE_STOP_BYTES - bytes} bytes (90%)`
  );
  // INSIDE the unstable_cache callback, before Next attempts its write. Never a post-write warning.
  assertSitemapCacheSize(bytes);
  return payload;
}

export async function decodeSitemapCache(payload: string): Promise<SectionedSitemapEntry[]> {
  assertSitemapCacheSize(dataCacheItemBytes(payload));
  return JSON.parse((await decompress(Buffer.from(payload, 'base64'))).toString('utf8'));
}
