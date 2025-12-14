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
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * app.get('/api/*', (req, res) => { ... });
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 * Angular 21 SSR (Fetch-based)
 */
app.use(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);

    if (!response) {
      return next();
    }

    /**
     * ✅ Handle HTTP status codes (404, 301, etc.)
     * Sent from Angular via response headers
     */
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
 * Start the server if this module is the main entry point,
 * or if it is run via PM2.
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
 * or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
