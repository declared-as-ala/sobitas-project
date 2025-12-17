import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';  // ← Important!

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      // Optional but recommended: smooth scrolling to anchor/fragment on navigation
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',  // or 'enabled' for full preservation
        anchorScrolling: 'enabled'
      })
    ),
    provideClientHydration(withEventReplay()),  // Hydration + replay buffered events
    provideHttpClient(withFetch())  // ← Fixes the warning + better SSR performance
  ]
};