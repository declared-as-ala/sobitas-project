import { CommandeService } from './../../apis/commande.service';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../apis/auth.service';
import Swal from 'sweetalert2';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-historique',
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.css'],
  imports: [CommonModule, DecimalPipe, RouterModule]
})
export class HistoriqueComponent implements OnInit {


  constructor(private api : AuthService , private router : Router, private cdr: ChangeDetectorRef){}

  commandes : any[] = []
  ngOnInit(): void {
    this.api.commandes().subscribe((res: any) => this.commandes = res)
    this.cdr.detectChanges();
  }
  /* annuler(id : number){
    Swal.fire({
      title: 'Etes vous sûr?',
      text: "Votre commande sera annuler",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Annuler Commande'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.annuler_commande(id)
        .subscribe(()=>{
          Swal.fire(
            'Commande annulée!',
            '',
            'success'
          )
          this.ngOnInit()
        })

      }
    })
  } */
}
