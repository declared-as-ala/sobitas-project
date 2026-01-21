import { NgxPaginationModule } from 'ngx-pagination';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { storage } from '../../apis/config';
import { GeneralService } from '../../apis/general.service';
import { ShopSection } from './ShopSection';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductComponent } from '../../shared/product/product.component';
import { LoaderComponent } from '../../shared/loader/loader.component';
import { environment } from '../../apis/config';

declare var $: any;
@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css'],
  imports: [BreadcrumbsComponent,RouterModule,FormsModule,ReactiveFormsModule,ProductComponent,NgxPaginationModule,LoaderComponent,CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent implements OnInit {
  constructor(
    private general: GeneralService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private metaService: Meta,
    private cdr: ChangeDetectorRef,
    private _render2: Renderer2,
    @Inject(DOCUMENT) private _document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
    if (this.route.snapshot.queryParams['add-to-cart']) {
      this.router.navigate(['/notfound'])
    }
  }
  shopSectionInfo:ShopSection | undefined;
  Surnom = '';
  nom :any;
  slug_sous_categ :any;
  slug_categ :any;
  tag :any;
  id_brand :any;
  packs : any;
  storage = storage;
  produits: any = [];
  all_produits: any = [];
  categories: any = [];
  souscategories: any = [];
  search = '';
  min = 0;
  max = 999;

  selected: any;
  brands: any = [];
  aromes: any = [];
  tags: any = [];
  media: any;
  p = 1;

  isFilter = true;
  isLoading = true;
  screenwidth = 1000;
  ngOnInit(): void {
    this.nom = this.route.snapshot.params['nom'];
    this.slug_sous_categ = this.route.snapshot.params['slug_sub'];
    this.slug_categ = this.route.snapshot.params['slug_cat'];
    this.tag = this.route.snapshot.params['tag'];
    this.id_brand = this.route.snapshot.params['id_brand'];
    this.packs = this.route.snapshot.params['packs'];
    //this.screenwidth = window.innerWidth;
    //if(){}
    if (isPlatformBrowser(this.platformId)) {
      this.getScreenSize();
      this.setup();
      
    }
    
    if (this.tag && this.slug_sous_categ) {
      this.nom = this.tag;
      this.general
        .searchProductBySubCategoryText(this.slug_sous_categ, this.tag)
        .subscribe((data: any) => {
          this.isLoading = false;
          this.all_produits = data.products;
          this.produits = data.products;
          this.getMaxMin();
          this.brands = data.brands;

          this.slug_sous_categ = undefined;
        });
    } else if (this.slug_sous_categ) {
      this.general
        .productsBySubCategoryId(this.slug_sous_categ)
        .subscribe((data: any) => {
          this.isLoading = false;
          this.selected = data.sous_category;
          this.setup();
          this.produits = data.products;
          this.all_produits = data.products;
          this.getMaxMin();
          this.brands = data.brands;
          this.souscategories = data.sous_categories;
        });
    } else if (this.slug_categ) {
      this.general
        .productsByCategoryId(this.slug_categ)
        .subscribe((data: any) => {
          this.isLoading = false;

          this.selected = data.category;
          this.setup();
          this.souscategories = data.sous_categories;
          this.all_produits = data.products;
          this.produits = data.products;
          this.getMaxMin();
          this.brands = data.brands;
        });
    } else if (this.tag) {
      this.nom = this.tag;
      this.general.searchProduct(this.tag).subscribe((data: any) => {
        this.isLoading = false;
        this.all_produits = data.products;
        this.produits = data.products;
        this.getMaxMin();
        this.brands = data.brands;
      });
    } else if (this.id_brand) {
      this.general.produits_par_marque(this.id_brand).subscribe((data: any) => {
        this.selected = data.brand;
        this.setup();
        this.isLoading = false;
        this.all_produits = data.products;
        this.produits = data.products;
        this.getMaxMin();
        this.brands = data.brands;
        this.categories = data.categories;
      });
    } else if (this.packs) {
      this.general.packs().subscribe((data: any) => {
        this.isLoading = false;

        this.all_produits = data;
        this.produits = data;
        this.getMaxMin();
        /*  this.brands = data.brands;
        this.categories = data.categories; */
      });
    } else {
      this.general.all_products().subscribe((data: any) => {
        this.isLoading = false;

        this.produits = data.products;
        this.all_produits = data.products;
        this.getMaxMin();
        this.categories = data.categories;
        this.brands = data.brands;
      });
    }

    this.general.aromes().subscribe((data: any) => {
      this.aromes = data;
    });
    this.general.tags().subscribe((data: any) => {
      this.tags = data;
    });

    this.general.media().subscribe((data: any) => {
      this.media = data;
    });
    this.isShopRoute()
    this.cdr.markForCheck();
  }
  @HostListener('window:resize', ['$event'])
  getScreenSize(event?: any) {
    this.screenwidth = window.innerWidth;
    if (this.screenwidth < 600) {
      this.isFilter = false;
    }
    this.cdr.markForCheck();
  }
  filtrer() {
    let amount = $('#amount').val();
    let tab = amount.split(' - ');
    this.min = tab[0];
    this.max = tab[1];
    this.produits = this.all_produits.filter((p: any) =>
      p.promo
        ? p.promo >= this.min && p.promo <= this.max
        : p.prix >= this.min && p.prix <= this.max
    );

    this.isFilter = false;
    this.cdr.markForCheck();
  }

  trier(event: any) {
    let tri = event.target.value;
    if (tri == 1) {
      this.produits = this.produits.sort(
        (a: any, b: any) => (a.new_product > b.new_product ? -1 : 1),
        0
      );
    } else if (tri == 2) {
      this.produits = this.produits.sort(
        (a: any, b: any) => (a.best_seller > b.best_seller ? -1 : 1),
        0
      );
    } else if (tri == 3) {
      this.produits = this.produits.sort(
        (a: any, b: any) => (a.note > b.note ? -1 : 1),
        0
      );
    } else if (tri == 4) {
      this.produits = this.produits.sort(
        (a: any, b: any) => (a.prix < b.prix ? -1 : 1),
        0
      );
    } else if (tri == 5) {
      this.produits = this.produits.sort(
        (a: any, b: any) => (a.prix > b.prix ? -1 : 1),
        0
      );
    }
    this.cdr.markForCheck();
  }

  loadScript() {
    let ctx = this;
    setTimeout(() => {
      /*     $('#slider-range').slider({
        range: true,
        min: 10,
        max: 700,
        values: [10, 700],
        slide: (event: any, ui: any) => {
          $('#amount').val(ui.values[0] + ' - ' + ui.values[1]);
          $('#min_amount').val(ui.values[0]);
          $('#max_amount').val(ui.values[1]);
        },
      });
      $('#amount').val(
        $('#slider-range').slider('values', 0) +' - ' + $('#slider-range').slider('values', 1)
      ); */
    }, 0);
    this.cdr.markForCheck();
  }

  arome: any;
  filter_arome(event: any) {
    let arome = event.target.value;
    if (arome && arome != '') {
      this.arome = arome;

      this.nom = arome.designation_fr;
      this.produits = this.all_produits.filter(
        (x: any) => x.aromes && x.aromes.find((y: any) => y.id == arome.id)
      );

      this.id_brand = undefined;
      this.tag = undefined;
      this.slug_categ = undefined;
      this.slug_sous_categ = undefined;
    } else {
      this.produits = this.all_produits;
    }
    this.isFilter = false;

    this.getMaxMin();
    this.cdr.markForCheck();
  }

  filter_tag(tag: any) {
    if (tag) {
      this.tag = tag;
      this.nom = tag.designation_fr;
      this.produits = this.all_produits.filter(
        (x: any) => x.tags && x.tags.find((y: any) => y.id == tag.id)
      );
      this.id_brand = undefined;
      this.arome = undefined;
      this.slug_categ = undefined;
      this.slug_sous_categ = undefined;
    } else {
      this.produits = this.all_produits;
    }
    this.isFilter = false;

    this.getMaxMin();
    this.cdr.markForCheck();
  }

  getMaxMin() {
    /*   this.max = 0
    this.max = this.produits.map((x : any)=> x.prix > this.max ? x.prix : this.max)

    this.min = 999999
    this.min = this.produits.map((x : any)=> x.prix < this.min ? x.prix : this.min)
 */
    this.loadScript();
    this.cdr.markForCheck();
  }

  setup() {
  if (!this.selected) return;

  // Set page title
  this.title.setTitle(this.selected.designation_fr);

  // Canonical URL
  this.createCanonicalURL();

  // Open Graph meta tags
  if (this.selected.cover) {
    this.metaService.updateTag({ property: 'og:image', content: storage + this.selected.cover });
    this.metaService.updateTag({ property: 'og:image:image:secure_url', content: storage + this.selected.cover });
  }
  this.metaService.updateTag({ property: 'og:title', content: this.selected.designation_fr });
  this.metaService.updateTag({ property: 'og:description', content: this.selected.description_cover });

  // Custom meta tags
  if (this.selected.meta && this.selected.meta !== '') {
    const tags = this.selected.meta.split('|');
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
    this.metaService.updateTag({ name: 'title', content: this.selected.designation_fr });
    this.metaService.updateTag({ name: 'description', content: this.selected.description_fr });
    this.metaService.updateTag({ name: 'image', content: storage + this.selected.cover });
  }

  // JSON-LD Product schema (SSR-friendly)
  const productData: any = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": this.selected.designation_fr,
    "description": this.selected.content_seo || this.selected.description_fr,
    "image": storage + this.selected.cover,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "TND",
      "price": this.selected.price || 0,
      "availability": "https://schema.org/InStock",
      "url": window.location.href ?? 'https://www.protein.tn',
      "offerCount": 1
    }
  };

  // Add reviews only if they exist
  if (this.selected.reviews && this.selected.reviews.length > 0) {
    const ratingValue = this.calculateAverageStars();
    if (ratingValue > 0) {
      productData.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": Number(ratingValue.toFixed(1)),
        "bestRating": 5,
        "ratingCount": this.selected.reviews.length
      };
    }
    productData.review = this.selected.reviews; // optional, can format properly
  }

  const script = this._render2.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(productData); // safe serialization
  this._render2.appendChild(this._document.head, script); // head for SEO

  this.cdr.markForCheck(); // only needed for client updates
}

createCanonicalURL() {
  const link: HTMLLinkElement = this._document.createElement('link');
  link.setAttribute('rel', 'canonical');

  let url = this._document.URL;

  // Use production base URL if in production
  if (environment.production) {
    const path = this._document.location.pathname + this._document.location.search;
    url = environment.baseUrl + path;
  } else {
    url = url.replace('http://', 'https://');
  }

  link.setAttribute('href', url);
  this._document.head.appendChild(link);
  this.cdr.markForCheck();
}

  isShopRoute() {
    if (this.router.url === '/shop') {
      this.general.getShopSectionTitles().subscribe((data: ShopSection) => {
        this.shopSectionInfo=data
        this.cdr.markForCheck();
      });
    }
    this.cdr.markForCheck();
  }
  calculateAverageStars() {
    if (!this.selected.reviews || this.selected.reviews.length === 0) {
      return 0;
    }
    const totalStars = this.selected.reviews.reduce((sum: number, review: any) => sum + review.stars, 0);
    return Number((totalStars / this.selected.reviews.length).toFixed(1));
  }

}
