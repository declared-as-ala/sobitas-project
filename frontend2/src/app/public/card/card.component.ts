import { storage } from '../../apis/config';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
declare var $ : any
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styles: [
  ],
  imports: [RouterModule,BreadcrumbsComponent,DecimalPipe,ReactiveFormsModule,FormsModule,CommonModule]
})

export class CardComponent implements OnInit {
  storage = storage
  panier = JSON.parse(localStorage.getItem('panier') || '[]')

  frais_livraison = 10;
  livraison = true
  constructor(private router : Router, private cdr: ChangeDetectorRef){}
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
    this.cdr.detectChanges();
  }

  totale = 0
  calcule(){
    this.totale = this.panier.reduce((accumulateur : number , p : any)=> accumulateur + p.prix_totale , 0)

   this.test()
   this.cdr.detectChanges();

  }

  supprimer(position : number){
    this.panier.splice(position , 1)
    localStorage.setItem('panier' , JSON.stringify(this.panier))
    this.calcule()
    setTimeout(() => {
      $('#panier_nb').text(this.panier.length);
      $('#panier_totale').text(this.totale.toFixed(3));
    }, 1);
    this.cdr.detectChanges();
  }
  passerCommande(){
    localStorage.setItem('frais_livraison' , this.frais_livraison+'')
    localStorage.setItem('livraison' , this.livraison+'')
    this.router.navigate(['/checkout'])
    this.cdr.detectChanges();
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
    this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }
}
