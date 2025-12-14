import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedRoutingModule } from './shared-routing.module';

// ──────────────────────────────
// All your standalone items
// ──────────────────────────────
import { ArticleComponent } from './article/article.component';
import { ProductComponent } from './product/product.component';
import { BreadcrumbsComponent } from './breadcrumbs/breadcrumbs.component';
import { SocialShareComponent } from './social-share/social-share.component';
import { LoaderComponent } from './loader/loader.component';
import { SafePipe } from './safe.pipe';                     // ← now standalone!

// ngx-sharebuttons (latest)
import { ShareButtons } from 'ngx-sharebuttons/buttons';

@NgModule({
  declarations: [
    // NOTHING goes here anymore!
    // All your components + pipe are standalone → declarations must be empty
  ],
  imports: [
    CommonModule,
    SharedRoutingModule,

    // All standalone items go here
    ArticleComponent,
    ProductComponent,
    BreadcrumbsComponent,
    SocialShareComponent,
    LoaderComponent,
    SafePipe,           // ← moved from declarations → imports
    ShareButtons
  ],
  exports: [
    CommonModule,
    SharedRoutingModule,

    // Re-export everything so other modules can use them without importing again
    ArticleComponent,
    ProductComponent,
    BreadcrumbsComponent,
    SocialShareComponent,
    LoaderComponent,
    SafePipe,
    ShareButtons
  ]
})
export class SharedModule { }