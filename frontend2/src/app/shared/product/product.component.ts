import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, NgFor, NgIf, NgOptimizedImage, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { storage } from '../../apis/config';

declare var $: any;

@Component({
  selector: 'app-product',
  standalone: true,
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  imports: [CommonModule, NgOptimizedImage, NgFor, NgIf, RouterLink],
})
export class ProductComponent implements OnInit {
  @Input() product: any;
  @Input() key: any;

  clicked = false;
  gallery: any = [];
  storage = storage;
  percentage = 0;
  quantity = 1;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.product?.promo) {
      const discount = this.product.prix - this.product.promo;
      this.percentage = Math.round((discount / this.product.prix) * 100);
      this.cdr.detectChanges();
    }
  }

  updatequantity(e: any) {
    this.quantity = +e.target.value;
    this.cdr.detectChanges();
  }

  addToCard() {
    if (!isPlatformBrowser(this.platformId)) return; // only run in browser

    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    const exist = panier.findIndex((x: any) => x.product?.id === this.product.id);

    if (exist !== -1) {
      panier[exist].quantite += this.quantity;
      panier[exist].prix_totale =
        panier[exist].quantite *
        (this.product.promo ? this.product.promo : this.product.prix);
    } else {
      panier.push({
        product: this.product,
        produit_id: this.product.id,
        quantite: this.quantity,
        prix_unitaire: this.product.promo ? this.product.promo : this.product.prix,
        prix_totale: this.quantity * (this.product.promo ? this.product.promo : this.product.prix),
      });
    }

    localStorage.setItem('panier', JSON.stringify(panier));

    // jQuery DOM updates only in browser
    setTimeout(() => {
      const total = panier.reduce((a: number, b: any) => a + b.prix_totale, 0);

      $('#panier_nb').text(panier.length);
      $('#panier_totale').text(total.toFixed(3));
      $('#mini_cart').addClass('active');

      // Generate HTML without Angular bindings
      let html = '';
      panier.forEach((line: any) => {
        html += `
          <div class="cart_item">
            <div class="cart_img">
              <a href="/shop/${line.product?.slug}">
                <img src="${storage}${line.product?.cover}" alt="${line.product?.designation_fr}">
              </a>
            </div>
            <div class="cart_info">
              <a href="/shop/${line.product?.slug}">${line.product?.designation_fr}</a>
              <p>Qty: ${line.quantite} X ${line.prix_totale.toFixed(3)}</p>
            </div>
          </div>`;
      });

      html += `
        <div class="mini_cart_table">
          <div class="cart_total mt-10">
            <span>Totale:</span>
            <span class="price">${total.toFixed(3)} DT</span>
          </div>
        </div>`;
      $('#cart_items').html(html);
    }, 1);
    this.cdr.detectChanges();
  }
}
