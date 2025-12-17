import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { storage } from '../apis/config';
import { GeneralService } from '../apis/general.service';
import { ProductComponent } from '../shared/product/product.component';
import { ArticleComponent } from '../shared/article/article.component';
import { SlidesComponent } from '../components/slides/slides.component';
import { CategoriesComponent } from '../components/categories/categories.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls:[],
  imports: [CommonModule,ProductComponent, ArticleComponent, SlidesComponent, CategoriesComponent],
})
export class HomeComponent implements OnInit {
  constructor(
    @Inject(PLATFORM_ID) private platform_id: Object,
    private general: GeneralService,
    @Inject(DOCUMENT) private _document: Document,
    private cdr: ChangeDetectorRef
  ) { }

  marques: any;
  storage = storage;


  slides: any = [
    {
        "cover": "assets/img/slides/silde1.webp",
        "designation_fr": "Sobitas, votre boutique de compléments alimentaires en ligne",
        "description_fr": null,
        "btn_text_fr": "Liste des produits",
        "btn_link": null,
        "position": "center",
        "text_color": "#080808",
        "text_weight": "100",
        "type": "web"
    },
    {
        "cover": "assets/img/slides/hardmas_cover.webp",
        "designation_fr": "Sobitas, votre boutique de compléments alimentaires en ligne en Tunisie",
        "description_fr": null,
        "btn_text_fr": null,
        "btn_link": null,
        "position": "right",
        "text_color": "#07e921",
        "text_weight": "600",
        "type": "web"
    },
    {
      "cover": "assets/img/slides/platinum_creatine_cover.webp",
        "designation_fr": null,
        "description_fr": null,
        "btn_text_fr": null,
        "btn_link": null,
        "position": "right",
        "text_color": "#000000",
        "text_weight": "100",
        "type": "web"
    },
        {
        "cover": "assets/img/slides/sobitas_slidem.webp",
        "designation_fr": null,
        "description_fr": null,
        "btn_text_fr": null,
        "btn_link": null,
        "position": "right",
        "text_color": "#ff0000",
        "text_weight": "100",
        "type": "mobile"
    },
    {
        "cover": "assets/img/slides/hardmass_sliderm.webp",
        "designation_fr": null,
        "description_fr": null,
        "btn_text_fr": null,
        "btn_link": null,
        "position": "right",
        "text_color": "#ff0000",
        "text_weight": "100",
        "type": "mobile"
    },
    /*{
        "cover": "assets/img/slides/sobitas_slide2m.webp",
        "designation_fr": null,
        "description_fr": null,
        "btn_text_fr": null,
        "btn_link": null,
        "position": "right",
        "text_color": "#ff0000",
        "text_weight": "100",
        "type": "mobile"
    },*/
]
  articles: any[] = [];
  best_sellers: any = [];
  packs: any = [];
  new_products: any = [];
  brands: any = [];
  media: any;
  //from here you can add more categories and category images to the list
  categories = [
    {
        "cover": "https://i.imgur.com/CVFd8hV.png",
        "slug": "complements-alimentaires",
        "designation_fr": "COMPLÉMENTS ALIMENTAIRES"
    },
    {
        "cover": "https://i.imgur.com/YcR1O0I.png",
        "slug": "perte-de-poids",
        "designation_fr": "PERTE DE POIDS"
    },
    {
        "cover": "https://i.imgur.com/6hllFw7.png",
        "slug": "prise-de-masse",
        "designation_fr": "PRISE DE MASSE"
    },
    {
        "cover": "https://i.imgur.com/LFH4dGf.png",
        "slug": "proteines",
        "designation_fr": "PROTEINES"
    },
    {
        "cover": "https://i.imgur.com/5jN4Y3p.png",
        "slug": "complements-d-entrainement",
        "designation_fr": "PRE, INTRA & POST WORKOUT"
    },
    {
        "cover": "https://i.imgur.com/Lj0ymUa.png",
        "slug": "equipements-et-accessoires-sportifs",
        "designation_fr": "VETEMENTS ET ACCESSOIRES"
    }
]
  ngOnInit() {
    // this.general.slides().subscribe((data: any) => {
    //   this.slides = data;
    //   console.log(this.slides)
    // });
    // this.general.categories().subscribe((data: any) => {
    //   this.categories = data;
    // });


    this.general.latest_products().subscribe((data: any) => {
      //i want just 4 products
      this.new_products = data.new_product.slice(0, 4);
      this.best_sellers = data.best_sellers;
      this.packs = data.packs
      this.cdr.detectChanges();
    });
    
    this.createCanonicalURL()
    setTimeout(() => {
    }, 100);
    if (isPlatformBrowser(this.platform_id)) {
      setTimeout(() => {
        this.general.media()
          .subscribe((data: any) => {
            this.media = data;
          })


        this.general.lastArticles().subscribe((d: any) => {
          this.articles = d;
        });
      }, 0);
    }

    this.cdr.detectChanges();
  }
  createCanonicalURL() {
    let link: HTMLLinkElement = this._document.createElement('link');
    link.setAttribute('rel', 'canonical');
    this._document.head.appendChild(link);
    let url = this._document.URL
    url = url.replace('http://', 'https://')
    link.setAttribute('href', url);
    this.cdr.detectChanges();
  }
  trackByProduct(index: number, item: any) {
  return item.id || index;
}

trackByArticle(index: number, item: any) {
  return item.id || index;
}

  
}
export class SlugService {
  // Function to create a SEO-friendly slug
  createSlug(input: string): string {
    return input
      .trim()              // Remove leading/trailing whitespace
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase();      // Optionally, convert everything to lowercase
  }
}