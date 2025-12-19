import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * =====================================================
 * robots.txt & sitemap.xml (cache 24h)
 * =====================================================
 */
app.get('/robots.txt', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(join(browserDistFolder, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(join(browserDistFolder, 'sitemap.xml'));
});

/**
 * =====================================================
 * Static assets (JS, CSS, fonts, images)
 * Cache 1 YEAR + immutable
 * =====================================================
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    immutable: true,
    index: false,
    redirect: false,
    setHeaders(res, path) {
      // Never cache HTML files
      if (path.endsWith('.html')) {
        res.setHeader(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, proxy-revalidate'
        );
      }
    },
  })
);

/**
 * =====================================================
 * Angular SSR (HTML)
 * NO browser cache
 * =====================================================
 */
app.use(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);
    if (!response) return next();

    // HTML SSR should always be fresh
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    // Forward Angular HTTP status
    const angularStatus = response.headers.get('x-angular-status');
    if (angularStatus) {
      res.status(Number(angularStatus));
    }

    writeResponseToNodeResponse(response, res);
  } catch (error) {
    next(error);
  }
});

/**
 * =====================================================
 * Start server
 * =====================================================
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`✅ Angular SSR server running on http://localhost:${port}`);
  });
}

/**
 * =====================================================
 * Angular CLI / Dev handler
 * =====================================================
 */
export const reqHandler = createNodeRequestHandler(app);
