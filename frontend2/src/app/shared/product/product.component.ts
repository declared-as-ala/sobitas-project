import {
  AsyncPipe,
  CommonModule,
  NgFor,
  NgIf,
  NgOptimizedImage,
  isPlatformBrowser,
} from '@angular/common';
import { Component, Inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { storage } from '../../apis/config';
import Swal from 'sweetalert2';
declare var $: any;
@Component({
  selector: 'app-product',
  standalone: true,
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  imports: [CommonModule, NgOptimizedImage, NgFor, NgIf, AsyncPipe, RouterLink],
})
export class ProductComponent implements OnInit {
  @Input() product: any;
  @Input() key: any;
  clicked = false;
  gallery: any = [];
  storage = storage;
  percentage = 0;
  quantity = 1;
  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }
  ngOnInit(): void {


    if (this.product.promo) {
      let p = this.product.prix - this.product.promo;
      let x = p / this.product.prix;
      x = x * 100;
      x = Number(x.toFixed(0));
      this.percentage = x;
    }
  }
  updatequantity(e: any) {
    this.quantity = +e.target.value;
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
          ? this.product.promo
          : this.product.prix,
      });
    }
    /*    Swal.fire({
      title: 'Produit ajouté au panier avec success',
      icon: 'success',
      toast: true,
      timer: 5000,
      showConfirmButton: false,
      position: 'top-end',
    }); */

    let total = panier.reduce((a: number, b: any) => a + b.prix_totale, 0);
    if (isPlatformBrowser(this.platformId)) {

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
            }"><img src="${storage}${line.product?.cover}" alt="${line.product?.designation_fr
            }"></a>
          </div>
           <div class="cart_info">
               <a [routerLink]="['/shop' , ${line.product?.slug}">${line.product?.designation_fr
            }</a>
               <p>Qty: ${line.quantite} X ${line.prix_totale.toFixed(3)} </p>
           </div>

       </div>
          `;
        });

        html += `<div class="mini_cart_table">

      <div class="cart_total mt-10">
          <span>Totale:</span>
          <span class="price">${total.toFixed(3)} DT</span>
      </div>
  </div>`;

        $('#cart_items').html(html);
      }, 1);
    }
    localStorage.setItem('panier', JSON.stringify(panier));
  }
}
