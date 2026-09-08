/** Read-only coverage denominator; fields=index selects columns, it does NOT filter noindex rows. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { crawlPaginated, describeCrawl } from '../src/util/sitemapCrawl.ts';

const run = promisify(execFile);

export async function countIndexableProducts(fetchPage) {
  const crawl = await crawlPaginated({
    label: 'indexable-product coverage', perPage: 500, maxRequests: 600,
    concurrency: 4, rowsKey: 'products', fetchPage,
  });
  const verdict = describeCrawl('indexable-product coverage', crawl);
  if (!verdict.verified || crawl.duplicates || crawl.unkeyed) {
    throw new Error(`${verdict.message}; cannot verify the indexable count`);
  }
  let indexable = 0;
  for (const product of crawl.rows) {
    // Match sitemapSources' publication and robots semantics, including legacy null => indexable.
    // Require the projection to carry the field: omission must not turn noindexed rows into URLs.
    if (!Object.hasOwn(product, 'seo_robots_index') && product.seo?.robots?.index == null) {
      throw new Error('API omitted seo_robots_index; indexable count cannot be verified');
    }
    if (!product.slug || !(product.publier == 1 || product.publier === undefined)) continue;
    const flag = product.seo?.robots?.index ??
      (product.seo_robots_index == null ? undefined : Boolean(product.seo_robots_index));
    if (flag !== false) indexable++;
  }
  return indexable;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.argv[2]?.replace(/\/$/, '');
  try {
    if (!base) throw new Error('Usage: count-indexable-products.mjs <backend/api>');
    const count = await countIndexableProducts(async (page, perPage) => {
      const url = `${base}/all_products?fields=index&per_page=${perPage}&page=${page}`;
      const { stdout } = await run('curl', ['-fsS', '--max-time', '90', url], {
        maxBuffer: 16 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    });
    console.log(count);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
