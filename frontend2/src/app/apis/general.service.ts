import { HttpClient } from '@angular/common/http';
import { Injectable , Inject } from '@angular/core';
import { host } from './config';
import { Cacheable } from 'ts-cacheable';
import { DOCUMENT } from '@angular/common';
import { Observable } from 'rxjs';
import { ShopSection } from '../public/products-list/ShopSection';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  constructor(private http:HttpClient , @Inject(DOCUMENT) private document: Document) {}

  @Cacheable()
  coordonnees() {
    return this.http.get(host + 'coordonnees');
  }

  @Cacheable()
  marques() {
    return this.http.get(host + 'marques');
  }

  // @Cacheable()
  categories() {
    return this.http.get(host + 'categories');
  }

  // @Cacheable()
  slides() {
    return this.http.get(host + 'slides');
  }

  @Cacheable()
  latest_products() {
    return this.http.get(host + 'latest_products');
  }

  @Cacheable()
  all_products() {
    return this.http.get(host + `all_products`);
  }
  @Cacheable()
  productsByCategoryId(categoryId: any) {
    return this.http.get(host + `productsByCategoryId/${categoryId}`);
  }
  productsBySubCategoryId(subCategoryId: any) {
    return this.http.get(host + `productsBySubCategoryId/${subCategoryId}`);
  }
  similar(subCategoryId: any) {
    return this.http.get(host + `similar_products/${subCategoryId}`);
  }
  searchProduct(text: any) {
    return this.http.get(host + `searchProduct/${text}`);
  }
  searchProductBySubCategoryText(subCategoryId: any, text: any) {
    return this.http.get(
      host + `searchProductBySubCategoryText/${subCategoryId}/${text}`
    );
  }

  produit(slug: any) {
    return this.http.get(host + 'product_details/' + slug);
  }

  @Cacheable()
  lastArticles() {
    return this.http.get(host + 'latest_articles');
  }
  articles() {
    return this.http.get(host + 'all_articles');
  }
  article(slug: any) {
    return this.http.get(host + 'article_details/' + slug);
  }

  brands() {
    return this.http.get(host + 'all_brands');
  }

  aromes() {
    return this.http.get(host + 'aromes');
  }
  tags() {
    return this.http.get(host + 'tags');
  }
  packs() {
    return this.http.get(host + 'packs');
  }
  produits_par_marque(id_brand: number) {
    return this.http.get(host + 'productsByBrandId/' + id_brand);
  }
  @Cacheable()
  ventes_flash() {
    return this.http.get(host + 'ventes_flash');
  }
  @Cacheable()
  media() {
    return this.http.get(host + 'media');
  }

  @Cacheable()
  services() {
    return this.http.get(host + 'services');
  }

  @Cacheable()
  pages() {
    return this.http.get(host + 'pages');
  }

  @Cacheable()
  page(slug: any) {
    return this.http.get(host + 'page/' + slug);
  }

  newsletter(body: any) {
    return this.http.post(host + 'newsletter', body);
  }

  contact(body : any){
    return this.http.post(host+'contact' , body)
  }

  @Cacheable()
  faqs() {
    return this.http.get(host + `faqs`);
  }
  getShopSectionTitles(): Observable<ShopSection> {
    return this.http.get<ShopSection>(host + 'seo_page/shop');
  }



  public loadScript() {
    let body = this.document.body;
    let script = this.document.createElement('script');
    script.innerHTML = '';
    script.src = '/assets/js/main.js';
    script.async = true;
    script.defer = true;
    body.appendChild(script);
  }

  public loadProducts() {
    setTimeout(() => {
     /*  $('.product_column5')
        .on('changed.owl.carousel initialized.owl.carousel', (event: any) => {
          $(event.target)
            .find('.owl-item')
            .removeClass('last')
            .eq(event.item.index + event.page.size - 1)
            .addClass('last');
        })
        .owlCarousel({
          loop: true,
          nav: false,
          autoplay: false,
          autoplayTimeout: 8000,
          items: 5,
          dots: false,
          margin: 30,
          responsiveClass: true,
          responsive: {
            0: {
              items: 1,
            },
            480: {
              items: 2,
            },
            768: {
              items: 3,
            },
            992: {
              items: 4,
            },
            1200: {
              items: 5,
            },
          },
        }); */
    }, 1);
  }
}
