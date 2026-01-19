import { map } from 'rxjs';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommandeService } from 'src/app/apis/commande.service';

@Component({
  selector: 'app-checkout-valid',
  templateUrl: './checkout-valid.component.html',
  styles: [
  ]
})
export class CheckoutValidComponent implements OnInit{

  constructor(private api : CommandeService , private router : Router,private cdr: ChangeDetectorRef){

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
      this.cdr.markForCheck();

    });
    this.cdr.detectChanges();
  }
}
