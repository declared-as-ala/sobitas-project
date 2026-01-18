import { CommonModule, DOCUMENT, NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Renderer2, Inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { storage } from '../../../apis/config';
import { GeneralService } from '../../../apis/general.service';
import { ArticleComponent } from '../../../shared/article/article.component';
import { SocialShareComponent } from '../../../shared/social-share/social-share.component';
import { BreadcrumbsComponent } from '../../../shared/breadcrumbs/breadcrumbs.component';
import { SafePipe } from '../../../shared/safe.pipe';

@Component({
  selector: 'app-blog-details',
  templateUrl: './blog-details.component.html',
  styleUrls: ['./blog-details.component.css'],
  imports: [CommonModule, ArticleComponent, SocialShareComponent, BreadcrumbsComponent, SafePipe, NgOptimizedImage],
})
export class BlogDetailsComponent implements OnInit {
  article: any = null;
  articles: any[] = [];
  slug: string = '';
  storage = storage;
  isBrowser: boolean;

  constructor(
    private general: GeneralService,
    private route: ActivatedRoute,
    private _cdr: ChangeDetectorRef,
    private _render2: Renderer2,
    @Inject(DOCUMENT) private _document: Document,
    private router: Router,
    private metaService: Meta,
    private title: Title,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.isBrowser = isPlatformBrowser(this.platformId); // SSR-safe check
  }

  reverseSlug(input: string): string {
    return input;
  }

  getSafeImageUrl(path: string): string {
    if (!path) return 'assets/img/blog/blog1.webp';
    // encode URI to prevent invalid characters
    return encodeURI(this.storage + path);
  }

  ngOnInit(): void {
    this.slug = this.reverseSlug(this.route.snapshot.params['slug']);

    // Fetch the main article
    this.general.article(this.slug).subscribe((data: any) => {
      this.article = data;
      this.setupMetaTagsAndJSONLD();
      this._cdr.markForCheck();
    });

    // Fetch last articles
    this.general.lastArticles().subscribe((d: any) => {
      this.articles = d;
      this._cdr.markForCheck();
    });
  }

  setupMetaTagsAndJSONLD(): void {
    if (!this.article) return;

    // SSR-safe meta tags
    this.title.setTitle(this.article.designation_fr);
    this.metaService.updateTag({ name: 'image', content: this.getSafeImageUrl(this.article.cover) });
    this.metaService.updateTag({ name: 'og:image', content: this.getSafeImageUrl(this.article.cover) });
    this.metaService.updateTag({ name: 'og:title', content: this.article.designation_fr });

    if (this.article.meta) {
      const tags = this.article.meta.split('|');
      tags.forEach((tag: string) => {
        const meta_data = tag.split(';');
        if (meta_data.length > 1) {
          this.metaService.updateTag({ name: meta_data[0].trim(), content: meta_data[1] });
          if (meta_data[0].trim() === 'title') {
            this.title.setTitle(meta_data[1]);
          }
        }
      });
    } else {
      this.metaService.updateTag({ name: 'title', content: this.article.designation_fr });
      this.metaService.updateTag({ name: 'description', content: this.article.description_fr });
    }

    // JSON-LD schema for SEO — only on browser
    if (this.isBrowser) {
      const avg = this.calculateAverageStars();
      const productData: any = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": this.article.designation_fr,
        "description": this.article.content_seo,
        "image": this.getSafeImageUrl(this.article.cover)
      };

      if (this.article.reviews?.length > 0) {
        productData.aggregateRating = {
          "@type": "AggregateRating",
          "bestRating": "5",
          "ratingCount": this.article.reviews.length,
          "ratingValue": avg
        };
      }

      const script = this._render2.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(productData);
      this._render2.appendChild(this._document.head, script);
    }
  }

  calculateAverageStars(): number {
    if (!this.article?.reviews || this.article.reviews.length === 0) return 0;
    const total = this.article.reviews.reduce((sum: number, r: any) => sum + r.stars, 0);
    return Number((total / this.article.reviews.length).toFixed(1));
  }
}
