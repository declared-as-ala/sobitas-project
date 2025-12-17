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
 * Serve sitemap.xml & robots.txt BEFORE Angular SSR
 */
app.get('/robots.txt', (req, res) => {
  res.sendFile(join(browserDistFolder, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(join(browserDistFolder, 'sitemap.xml'));
});

/**
 * Serve other static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application
 */
app.use(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600');
    if (!response) {
      return next();
    }

    // Handle HTTP status codes sent by Angular
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
 * Start the server if this module is the main entry point
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by Angular CLI (dev-server, build)
 */
export const reqHandler = createNodeRequestHandler(app);
