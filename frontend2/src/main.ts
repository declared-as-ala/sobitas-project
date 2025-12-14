import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { register as registerSwiper } from 'swiper/element/bundle';
registerSwiper();
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
