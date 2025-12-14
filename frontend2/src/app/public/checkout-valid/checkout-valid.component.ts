import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommandeService } from '../../apis/commande.service';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
@Component({
  selector: 'app-checkout-valid',
  templateUrl: './checkout-valid.component.html',
  styles: [
  ],
  imports: [ DecimalPipe, DatePipe, CommonModule ],
})
export class CheckoutValidComponent implements OnInit{

  constructor(private api : CommandeService , private router : Router){

  }

  id = localStorage.getItem('last_checkout')

commande : any
details : any
  ngOnInit(): void {
    if(!this.id){
      this.router.navigate(['/'])
    }

    localStorage.removeItem('last_checkout')


    this.api.details_commande(this.id)
    .subscribe((data : any)=>{

      this.commande = data.facture;
      this.details = data.details_facture



    })
  }
}
