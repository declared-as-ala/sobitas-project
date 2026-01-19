import { CommandeService } from '../../apis/commande.service';
import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, CommonModule, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../apis/auth.service';
import { storage } from '../../apis/config';
import Swal from 'sweetalert2';
import { LoaderComponent } from '../../shared/loader/loader.component';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

declare var $: any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  imports: [ReactiveFormsModule, DecimalPipe, LoaderComponent, CommonModule]
})
export class CheckoutComponent implements OnInit {

  storage = storage;

  panier: any[] = [];
  frais_livraison = 0;
  livraison: string | null = null;
  user_id: string | null = null;

  totale = 0;
  isLoading = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private api: CommandeService,
    private user: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  form: FormGroup = new FormGroup({
    user_id: new FormControl(null),

    nom: new FormControl('', [Validators.required, Validators.minLength(3)]),
    prenom: new FormControl('', [Validators.required, Validators.minLength(3)]),

    adresse1: new FormControl('', [Validators.minLength(12)]),
    adresse2: new FormControl('', [Validators.minLength(12)]),

    pays: new FormControl('Tunisie', Validators.required),
    ville: new FormControl(''),
    region: new FormControl(''),
    code_postale: new FormControl('', [Validators.min(1000), Validators.max(9999)]),

    phone: new FormControl('', [
      Validators.required,
      Validators.min(20000001),
      Validators.max(99999999)
    ]),

    email: new FormControl('', [Validators.required, Validators.minLength(10)]),
    note: new FormControl(''),

    livraison_address: new FormControl(''),
    livraison_nom: new FormControl(''),
    livraison_prenom: new FormControl(''),
    livraison_adresse1: new FormControl(''),
    livraison_adresse2: new FormControl(''),
    livraison_pays: new FormControl('Tunisie'),
    livraison_ville: new FormControl(''),
    livraison_region: new FormControl(''),
    livraison_code_postale: new FormControl('', [
      Validators.min(1000),
      Validators.max(9999)
    ]),
    livraison_phone: new FormControl('', [
      Validators.min(20000001),
      Validators.max(99999999)
    ]),
    livraison_email: new FormControl('', Validators.minLength(10))
  });

  ngOnInit(): void {

    // ✅ Browser-only logic
    if (isPlatformBrowser(this.platformId)) {

      this.panier = JSON.parse(localStorage.getItem('panier') || '[]');
      this.frais_livraison = Number(localStorage.getItem('frais_livraison') || 0);
      this.livraison = localStorage.getItem('livraison');
      this.user_id = localStorage.getItem('id');

      this.form.get('user_id')?.setValue(this.user_id);

      if (this.livraison === 'true') {
        this.form.get('adresse1')?.addValidators([Validators.required, Validators.minLength(12)]);
        this.form.get('ville')?.addValidators([Validators.required, Validators.minLength(3)]);
        this.form.get('region')?.addValidators([Validators.required, Validators.minLength(3)]);
        this.form.get('code_postale')?.addValidators([Validators.required]);
      }

      if (localStorage.getItem('token')) {
        this.loadUserProfile();
      }
    }

    this.calcule();
    this.cdr.markForCheck();
  }

  loadUserProfile() {
    this.user.profil().subscribe((data: any) => {
      if (data?.email) this.form.get('email')?.setValue(data.email);
      if (data?.phone) this.form.get('phone')?.setValue(data.phone);

      if (data?.name) {
        const parts = data.name.split(' ');
        const prenom = parts.slice(0, -1).join(' ');
        const nom = parts.slice(-1).join(' ');

        this.form.get('prenom')?.setValue(prenom);
        this.form.get('nom')?.setValue(nom);
      }

      this.cdr.markForCheck();
    });
  }

  calcule() {
    this.totale = this.panier.reduce(
      (acc: number, p: any) => acc + Number(p.prix_totale || 0),
      0
    );
  }

  valider() {
    if (!this.form.valid) return;

    const commande = { ...this.form.value };

    commande.livraison = this.livraison === 'true' ? 1 : 0;
    commande.frais_livraison = this.livraison === 'true'
      ? this.frais_livraison
      : 0;

    this.isLoading = true;

    this.api.passer_commande(commande, this.panier)
      .pipe(
        timeout(10000),
        catchError(() => {
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe((result: any) => {
        if (!result) return;

        this.isLoading = false;

        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('panier');
          localStorage.setItem('last_checkout', result.id + '');

          setTimeout(() => {
            $('#panier_nb').text('0');
            $('#panier_totale').text('0.000');
          }, 0);

          Swal.fire({
            title: 'Merci pour votre commande',
            icon: 'success',
            toast: true,
            timer: 5000,
            showConfirmButton: false,
            position: 'top-end'
          });
        }

        this.panier = [];
        this.router.navigate(['/checkout-valid']);
        this.cdr.markForCheck();
      });
  }
}
