import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html'
})
export class PageNotFoundComponent {
  constructor(meta: Meta) {
    meta.addTag({ name: 'x-angular-status', content: '404' });
  }
}
