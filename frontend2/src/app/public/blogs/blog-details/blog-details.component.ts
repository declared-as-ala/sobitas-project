import { CommonModule, DOCUMENT, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, Renderer2 , Inject, Pipe, ChangeDetectorRef} from '@angular/core';
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
  imports: [CommonModule,ArticleComponent,SocialShareComponent,BreadcrumbsComponent,SafePipe,NgOptimizedImage],
})
export class BlogDetailsComponent implements OnInit {


  constructor(private general : GeneralService , private route : ActivatedRoute ,
    private _cdr : ChangeDetectorRef,
    private _render2:Renderer2,
    @Inject(DOCUMENT) private _document : Document,
     private router : Router , private metaService : Meta , private title : Title){
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
  }

  storage =storage
  article : any
  articles : any = []
  slug: any;
  reverseSlug(input: string): string {
    return input.replace(/-/g, ' ');
  }
  ngOnInit(): void {
    this.slug = this.reverseSlug(this.route.snapshot.params['slug'])
    this.general.article(this.slug)
    .subscribe((data : any)=>{
      this.article = data
      this.setup()
    })

    this.general.lastArticles().subscribe((d: any) => {
      this.articles = d;
    });
    this._cdr.detectChanges();
  }

  setup() {
    if (!this.article) return;

    // Set title and meta tags
    this.title.setTitle(this.article.designation_fr);
    this.metaService.updateTag({ name: 'image', content: storage + this.article.cover });
    this.metaService.updateTag({ name: 'og:image', content: storage + this.article.cover });
    this.metaService.updateTag({ name: 'og:title', content: this.article.designation_fr });

    if (this.article.meta && this.article.meta !== '') {
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

    // Build JSON-LD object safely
    const avg = this.calculateAverageStars();
    const productData: any = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": this.article.designation_fr,
      "description": this.article.content_seo,
      "image": `${storage}${this.article.cover}`
    };

    if (this.article.reviews && this.article.reviews.length > 0) {
      productData.aggregateRating = {
        "@type": "AggregateRating",
        "bestRating": "5",
        "ratingCount": this.article.reviews.length,
        "ratingValue": avg
      };
    }

    // Create and append JSON-LD script to head
    const script = this._render2.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(productData); // safe JSON serialization
    this._render2.appendChild(this._document.head, script); // append to head for SEO

    this._cdr.detectChanges(); // only needed for client updates
  }

    calculateAverageStars() {
    if (this.article.reviews.length === 0) {
      return 0
    }
    const totalStars = this.article.reviews.reduce((sum: any, review: any) => sum + review.stars, 0);
    return (totalStars / this.article.reviews.length).toFixed(1);
  }
}
