import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { storage } from '../../apis/config';
import { CommonModule, DecimalPipe } from '@angular/common';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
import { FormsModule } from '@angular/forms';
declare var $ : any
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styles: [
  ],
  imports: [
    CommonModule,
    RouterModule,
    DecimalPipe,
    BreadcrumbsComponent,
    FormsModule,
  ],
})

export class CardComponent implements OnInit {
  storage = storage
  panier = JSON.parse(localStorage.getItem('panier') || '[]')

  frais_livraison = 10;
  livraison = true
  constructor(private router : Router ){}
  ngOnInit(): void {
    this.calcule()
  }
  update_qte(event : any , position : number){
    let q = +event.target.value
    this.panier[position].quantite = q
    this.panier[position].prix_totale = q * this.panier[position].prix_unitaire
    localStorage.setItem('panier' , JSON.stringify(this.panier))
    this.calcule()
    setTimeout(() => {
      $('#panier_nb').text(this.panier.length);
      $('#panier_totale').text(this.totale.toFixed(3));
    }, 1);
  }

  totale = 0
  calcule(){
    this.totale = this.panier.reduce((accumulateur : number , p : any)=> accumulateur + p.prix_totale , 0)

   this.test()

  }

  supprimer(position : number){
    this.panier.splice(position , 1)
    localStorage.setItem('panier' , JSON.stringify(this.panier))
    this.calcule()
    setTimeout(() => {
      $('#panier_nb').text(this.panier.length);
      $('#panier_totale').text(this.totale.toFixed(3));
    }, 1);
  }
  passerCommande(){


    localStorage.setItem('frais_livraison' , this.frais_livraison+'')
    localStorage.setItem('livraison' , this.livraison+'')
    this.router.navigate(['/checkout'])
  }

  test(){
    if(this.livraison){
      this.frais_livraison = 10
    }else{
      this.frais_livraison = 0
    }
    if(this.totale >= 300){
      this.frais_livraison = 0
    }
  }

  inc_dec_qte(type : string , position : number){

    let currentQte= +this.panier[position].quantite
    if(type == 'inc'){
      let q = currentQte +1
      this.panier[position].quantite = q
      this.panier[position].prix_totale = q * this.panier[position].prix_unitaire

    }else{
      if(currentQte > 1){
        let q = currentQte -1
        this.panier[position].quantite = q
        this.panier[position].prix_totale = q * this.panier[position].prix_unitaire
      }

    }


    localStorage.setItem('panier' , JSON.stringify(this.panier))
    this.calcule()
    setTimeout(() => {
      $('#panier_nb').text(this.panier.length);
      $('#panier_totale').text(this.totale.toFixed(3));
    }, 1);
  }
}
