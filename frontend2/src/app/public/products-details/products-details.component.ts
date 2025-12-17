import { GeneralService } from '../../apis/general.service';
import { AuthService } from '../../apis/auth.service';
import { ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { storage } from '../../apis/config';
import Swal from 'sweetalert2';
import { Title } from "@angular/platform-browser";
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
import { ProductComponent } from '../../shared/product/product.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { SocialShareComponent } from '../../shared/social-share/social-share.component';
import { environment } from '../../apis/config';

declare var $: any;
@Component({
  selector: 'app-products-details',
  templateUrl: './products-details.component.html',
  styleUrls: ['./products-details.component.css'],
  imports: [BreadcrumbsComponent,CommonModule,RouterModule,ProductComponent,ReactiveFormsModule,NgxPaginationModule,SocialShareComponent,FormsModule]

})
export class ProductsDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('container')
  containera!: ElementRef;
  containerb!: ElementRef;
  containerc!: ElementRef;
  login: FormGroup
  isUserAuthenticated: boolean = false
  reviewComment: any;
  constructor(
    private api: AuthService,
    private general: GeneralService,
    private route: ActivatedRoute,
    private router: Router,
    private metaService: Meta,
    private title: Title,
    private _render2: Renderer2,
    @Inject(DOCUMENT) private _document: Document,
    private cdr: ChangeDetectorRef
  ) {
    this.login = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    })
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      setTimeout(() => {
        $('div.zoomContainer').remove();
      }, 0);
      return false;
    };
    this.cdr.detectChanges();
  }
  slug: any ;
  product: any;
  storage = storage;
  gallery: any = [];
  related_products: any = [];
  quantity = 1;
  average: any;
  p = 1;

  calculateAverageStars() {
    if (this.product.reviews.length === 0) {
      return 0
    }
    const totalStars = this.product.reviews.reduce((sum: any, review: any) => sum + review.stars, 0);
    return (totalStars / this.product.reviews.length).toFixed(1);
  }
  ngOnInit() {
    this.slug = this.route.snapshot.params['slug'];
    this.general.produit(this.slug).subscribe((res) => {
      this.product = res;
      this.average = this.calculateAverageStars()

      this.setup()
      this.settupSchema()
      this.gallery = JSON.parse(this.product?.gallery);

      if (this.product.sous_categorie_id) {
        this.general
          .similar(this.product.sous_categorie_id)
          .subscribe((data: any) => {
            this.related_products = data.products;
            setTimeout(() => { }, 2);
          });
      }
    });
    this.isUserAuthenticated = this.isAuthenticated();
    this.cdr.detectChanges();
  }
  public isAuthenticated(): boolean {
    if (localStorage.getItem('token') == null) {
      return false
    }
    else
      return true
  }
  settupSchema() {
    if (!this.product) return;

    const avg = this.calculateAverageStars();

    const productData: any = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": this.product.designation_fr,
      "description": this.product.content_seo,
      "image": `${storage}${this.product.cover}`
    };

    if (this.product.reviews && this.product.reviews.length > 0) {
      productData.aggregateRating = {
        "@type": "AggregateRating",
        "bestRating": "5",
        "ratingCount": this.product.reviews.length,
        "ratingValue": avg
      };
    }

    const script = this._render2.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(productData); // safe JSON serialization

    this._render2.appendChild(this._document.head, script); // append to head for SEO

    this.cdr.detectChanges(); // only needed for client updates
  }
  addToCard() {
    let panier = JSON.parse(localStorage.getItem('panier') || '[]');
    let exist = panier.findIndex(
      (x: any) => x.product && x.product.id == this.product.id
    );
    if (exist != -1) {
      let q = panier[exist].quantite;
      q = q + this.quantity;
      panier[exist] = {
        product: this.product,
        produit_id: this.product.id,
        quantite: q,
        prix_unitaire: this.product.promo
          ? this.product.promo
          : this.product.prix,
        prix_totale: this.product.promo
          ? this.product.promo * q
          : this.product.prix * q,
      };
    } else {
      panier.push({
        product: this.product,
        produit_id: this.product.id,
        quantite: this.quantity,
        prix_unitaire: this.product.promo
          ? this.product.promo
          : this.product.prix,
        prix_totale: this.product.promo
          ? this.product.promo * this.quantity
          : this.product.prix * this.quantity,
      });
    }
    Swal.fire({
      title: 'Produit ajouté au panier avec success',
      icon: 'success',
      toast: true,
      timer: 5000,
      showConfirmButton: false,
      position: 'top-end',
    });

    let total = panier.reduce((a: number, b: any) => a + b.prix_totale, 0);
    setTimeout(() => {
      $('#panier_nb').text(panier.length);
      $('#panier_totale').text(total.toFixed(3));
      $('#mini_cart').addClass('active');

      var html = ``;
      panier.map((line: any) => {
        html += `
          <div class="cart_item">
          <div class="cart_img">
              <a [routerLink]="['/shop' , ${line.product?.slug
          }"><img src="${storage}${line.product?.cover}"
                    alt="${line.product?.designation_fr}"></a>
                </div>
                <div class="cart_info">
                    <a [routerLink]="['/shop' , ${line.product?.slug}">${line.product?.designation_fr}</a>
                    <p>Qty: ${line.quantite} X ${line.prix_totale.toFixed(3)} </p>
                </div>
          </div>`;
      });

      html += `<div class="mini_cart_table">
          <div class="cart_total mt-10">
              <span>Totale:</span>
              <span class="price">${total.toFixed(3)} DT</span>
          </div>
      </div>`;
      $('#cart_items').html(html);

    }, 1);
    localStorage.setItem('panier', JSON.stringify(panier));
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    setTimeout(() => {
      // $('div.zoomContainer').remove();
    }, 0);
  }


  setup() {
    this.title.setTitle(this.product.designation_fr);
    this.createCanonicalURL()
    this.metaService.updateTag({ name: 'image', content: storage + this.product.cover });
    this.metaService.addTag({ property: 'og:image', content: storage + this.product.cover });
    this.metaService.addTag({ property: 'og:title', content: this.product.designation_fr });
    this.metaService.addTag({ property: 'og:image:secure_url', content: storage + this.product.cover });


    if (this.product.meta && this.product.meta != '') {
      let tags = this.product.meta.split('|');
      if (tags && tags.length > 0) {
        tags.map((tag: any) => {
          let meta_data = tag.split(';');
          if (meta_data && meta_data.length > 1) {
            this.metaService.updateTag({ name: meta_data[0].trim(), content: meta_data[1] });
            if (meta_data[0].trim() == 'title') {
              this.title.setTitle(meta_data[1]);
            }
          }
        })
      }
    } else {
      this.metaService.updateTag({ name: 'title', content: this.product.designation_fr });
      this.metaService.updateTag({ name: 'description', content: this.product.description_fr });
    }
    this.cdr.detectChanges();
  }

  inc_dec_qte(type: string) {
    if (type == 'inc') {
      this.quantity++
    } else {
      if (this.quantity > 1) {
        this.quantity--
      }
    }
    this.cdr.detectChanges();
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
  }

  clicked: boolean = false
  openReviewModal() {
    this.clicked = true;
  }

  signin() {

    if (!this.isUserAuthenticated) {
      this.api.login(this.login.value)
        .subscribe((user: any) => {
          localStorage.setItem('name', user.name)
          localStorage.setItem('token', user.token)
          localStorage.setItem('id', user.id)
          let newReview = {
            "product_id": this.product.id,
            "stars": this.rating,
            "comment": this.reviewComment
          }
          this.api.sendReview(newReview).subscribe(
            data => {
              Swal.fire({
                icon: 'success', toast: true, timer: 4000, showConfirmButton: false, title: 'Success ! '
              })
              this.reviewComment = undefined
              $('#rv').modal('toggle');
              this.general.produit(this.slug).subscribe((res) => {
                this.product = res;
                this.average = this.calculateAverageStars()
              })
            }
          )
        }, err => {
          Swal.fire({
            icon: 'error', toast: true, timer: 4000, showConfirmButton: false, title: err.error.message
          })
        })
    }
    else {
      let newReview = {
        "product_id": this.product.id,
        "stars": this.rating,
        "comment": this.reviewComment
      }
      this.api.sendReview(newReview).subscribe(
        data => {
          Swal.fire({
            icon: 'success', toast: true, timer: 4000, showConfirmButton: false, title: 'Success ! '
          })
          this.reviewComment = undefined
          $('#rv').modal('toggle');

          this.general.produit(this.slug).subscribe((res) => {
            this.product = res;
            this.average = this.calculateAverageStars()
          })
        }
      )
    }
    this.cdr.detectChanges();
  }

  public stars: boolean[] = Array(5).fill(false);
  public rating: number = 0;
  public rate(rating: number) {
    this.rating = rating;
    this.stars = this.stars.map((_, i) => rating > i);
    this.cdr.detectChanges();
  }
  validateReview() {
    if (this.rating == 0 ) { return false } else { return true }
  }

}
