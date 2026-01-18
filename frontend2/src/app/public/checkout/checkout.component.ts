import { CommandeService } from '../../apis/commande.service';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../apis/auth.service';
import { storage } from '../../apis/config';
import Swal from 'sweetalert2';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LoaderComponent } from '../../shared/loader/loader.component';

declare var $ : any;
@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styles: [
  ],
  imports: [ReactiveFormsModule,DecimalPipe,LoaderComponent,CommonModule]
})

export class CheckoutComponent implements OnInit{
  storage = storage
  panier = JSON.parse(localStorage.getItem('panier') || '[]')
  frais_livraison = Number(localStorage.getItem('frais_livraison') || 0)
  livraison = localStorage.getItem('livraison')
  isLoading = false

  user_id = localStorage.getItem('id')

  constructor(private router : Router , private api : CommandeService , private user : AuthService, private cdr: ChangeDetectorRef){

  }

  form : FormGroup = new FormGroup({

    'user_id' : new FormControl(this.user_id ? this.user_id : null),
    'nom' : new FormControl('' , [Validators.required , Validators.minLength(3)]),
    'prenom' : new FormControl('' , [Validators.required , Validators.minLength(3)]),
    'adresse1' : new FormControl('' , this.livraison == 'true' ?  [Validators.required , Validators.minLength(12)] : [Validators.minLength(12)]),
    'adresse2' : new FormControl('' ,  Validators.minLength(12)),
    'pays' : new FormControl('Tunisie' , Validators.required),
    'ville' : new FormControl('', this.livraison  == 'true' ?  [Validators.required , Validators.minLength(3)] : []),
    'region' : new FormControl('', this.livraison  == 'true' ?  [Validators.required , Validators.minLength(3)] : []),
    'code_postale' : new FormControl('', this.livraison  == 'true'?  [Validators.required , Validators.min(1000) , Validators.max(9999)] : [ Validators.min(1000) , Validators.max(9999)]),
    'phone' : new FormControl('', [Validators.required,  Validators.min(20000001) , Validators.max(99999999)]),
    'email' : new FormControl('', [Validators.required , Validators.minLength(10)]),
    'note' : new FormControl(false ,  Validators.minLength(12)),
    'livraison_address' : new FormControl('' ,  Validators.minLength(12)),
    'livraison_nom' : new FormControl('' ,  Validators.minLength(3)),
    'livraison_prenom' : new FormControl('' ,  Validators.minLength(3)),
    'livraison_adresse1' : new FormControl('' ,  Validators.minLength(12)),
    'livraison_adresse2' : new FormControl('',  Validators.minLength(12)),
    'livraison_pays' : new FormControl('Tunisie'),
    'livraison_ville' : new FormControl('' ,  Validators.minLength(3)),
    'livraison_region' : new FormControl('' ,  Validators.minLength(3)),
    'livraison_code_postale' : new FormControl('' ,[ Validators.min(1000) , Validators.max(9999)]),
    'livraison_phone' : new FormControl('' , [Validators.min(20000001) , Validators.max(99999999)]),
    'livraison_email' : new FormControl('' ,  Validators.minLength(10))
  })

  ngOnInit(): void {
    if(localStorage.getItem('token')){
      this.user.profil()
      .subscribe((data : any)=>{


       let name = data.name

       if(data.email){
        this.form.get('email')?.setValue(data.email)
       }
       if(data.phone){
        this.form.get('phone')?.setValue(data.phone)
       }
       if(name){
        let name_tabs = name.split(' ');

        let fn = ''
        let ln = ''
        if(name_tabs.length >=4){
          fn = name_tabs[0] + ' ' + name_tabs[1]
          ln = name_tabs[2] + ' ' + name_tabs[3]
        }

        else if(name_tabs.length ==3){
          fn = name_tabs[0] + ' ' + name_tabs[1]
          ln = name_tabs[2]

        }else if(name_tabs.length ==2){
          fn = name_tabs[0]
          ln = name_tabs[1]
        }else{
          fn = name_tabs[0]
        }

        this.form.get('nom')?.setValue(ln)
        this.form.get('prenom')?.setValue(fn)
       }
      })
    }
    this.calcule()
    this.cdr.detectChanges();
  }


  totale = 0
  calcule(){
    this.totale = this.panier.reduce((accumulateur : number , p : any)=> accumulateur + p.prix_totale , 0)
  }

valider(){

  if(this.form.valid){
    let commande = this.form.value;
    if(this.livraison == 'true'){
      commande.livraison = 1;
      commande.frais_livraison = this.frais_livraison
    }else{
      commande.livraison = 0;
      commande.frais_livraison = 0;
    }
    let panier = this.panier
    this.isLoading = true
     this.api.passer_commande(commande , panier)
    .subscribe((result : any)=>{
      this.isLoading=false
      localStorage.removeItem('panier')
      this.panier = []
      setTimeout(() => {
        $('#panier_nb').text('0');
        $('#panier_totale').text('0.000');
      }, 1);
      this.cdr.detectChanges();
      localStorage.setItem('last_checkout' , result.id+'')
      Swal.fire({
        title: 'Merci pour votre commande',
        icon: 'success',
        toast: true,
        timer: 5000,
        showConfirmButton: false,
        position: 'top-end',
      });
      this.router.navigate(['/checkout-valid']);
      this.cdr.detectChanges();
    })
  }
  this.cdr.detectChanges();
}

}
