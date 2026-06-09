// Configure env so sitemap data points correctly
process.env.NEXT_PUBLIC_BASE_URL = 'https://protein.tn';
process.env.NEXT_PUBLIC_API_URL = 'https://admin.protein.tn/api';

const { getSitemapEntries } = require('../src/util/sitemapData');

async function runQa() {
  console.log('--- STARTING SITEMAP QA TEST ---');
  try {
    const entries = await getSitemapEntries();
    console.log('TOTAL SITEMAP ENTRIES GENERATED:', entries.length);
    
    const productEntries = entries.filter(e => e.url.includes('/shop/') || (e.url.split('/').length > 4));
    console.log('TOTAL PRODUCT ENTRIES:', productEntries.length);
    
    if (productEntries.length > 0) {
      console.log('SAMPLE PRODUCT URL:', productEntries[0].url);
      console.log('ANOTHER PRODUCT URL:', productEntries[Math.min(5, productEntries.length - 1)].url);
    } else {
      console.warn('WARNING: Still zero product entries! Let\'s print the first 20 general entries:');
      console.log(entries.slice(0, 20).map(e => e.url));
    }
  } catch (err) {
    console.error('QA TEST FAILED WITH ERROR:', err);
  }
}

runQa();
