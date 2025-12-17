import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { storage } from '../../apis/config';
import Swal from 'sweetalert2';
import { interval, map, Observable } from 'rxjs';
import { RouterModule } from '@angular/router';
declare var $: any;
@Component({
  selector: 'app-vente-flash-product',
  templateUrl: './vente-flash-product.component.html',
  styleUrls: ['./vente-flash-product.component.css'],
  imports: [CommonModule, RouterModule, NgOptimizedImage]
})
export class VenteFlashProductComponent implements OnInit {
  @Input() product: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef) {}

  gallery: any = [];
  storage = storage;
  percentage = 0;

  private _trialEndsAt: any;

  private _diff: number = 0;
  _days: number = 0;
  _hours: number = 0;

  _minutes: number = 0;

  _seconds: number = 0;
  ngOnInit(): void {
    //this.gallery =  JSON.parse(this.product.gallery)

    if (this.product.promo) {
      let p = this.product.prix - this.product.promo;
      let x = p / this.product.prix;
      x = x * 100;
      x = Number(x.toFixed(0));
      this.percentage = x;
    }

    this._trialEndsAt = this.product.promo_expiration_date;

    if(isPlatformBrowser(this.platformId)){

      interval(1000)
        .pipe(
          map((x) => {
            this._diff =
              Date.parse(this._trialEndsAt) - Date.parse(new Date().toString());
          })
        )
        .subscribe((x) => {
          this._days = this.getDays(this._diff);
          this._hours = this.getHours(this._diff);
          this._minutes = this.getMinutes(this._diff);
          this._seconds = this.getSeconds(this._diff);
        });
    }
    this.cdr.detectChanges();
  }

  getDays(t: number) {
    return Math.floor(t / (1000 * 60 * 60 * 24));
  }

  getHours(t: number) {
    return Math.floor((t / (1000 * 60 * 60)) % 24);
  }

  getMinutes(t: number) {
    return Math.floor((t / 1000 / 60) % 60);
  }

  getSeconds(t: number) {
    return Math.floor((t / 1000) % 60);
  }

  addToCard() {
    let panier = JSON.parse(localStorage.getItem('panier') || '[]');
    let exist = panier.findIndex(
      (x: any) => x.product && x.product.id == this.product.id
    );
    if (exist != -1) {
      let q = panier[exist].quantite;
      q = q + 1;
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
        quantite: 1,
        prix_unitaire: this.product.promo
          ? this.product.promo
          : this.product.prix,
        prix_totale: this.product.promo
          ? this.product.promo
          : this.product.prix,
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
    }, 1);
    localStorage.setItem('panier', JSON.stringify(panier));
    this.cdr.detectChanges();
  }
}
