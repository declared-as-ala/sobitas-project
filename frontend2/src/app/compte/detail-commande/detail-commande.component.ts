import { ChangeDetectorRef, Component, OnInit, Pipe } from '@angular/core';
import { ActivatedRoute , Router } from '@angular/router';
import { CommandeService } from '../../apis/commande.service';
import { GeneralService } from './../../apis/general.service';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-detail-commande',
  templateUrl: './detail-commande.component.html',
  styleUrls: ['./detail-commande.component.css'],
  imports: [CommonModule, DecimalPipe]
})
export class DetailCommandeComponent implements OnInit {

  constructor(private router : Router , private route : ActivatedRoute , private api : CommandeService, private cdr : ChangeDetectorRef){}
  id : any;

  commande : any
  details : any
    ngOnInit(): void {
      this.id = this.route.snapshot.params['id']
      if(!this.id){
        this.router.navigate(['/'])
      }

      localStorage.removeItem('last_checkout')


      this.api.details_commande(this.id)
      .subscribe((data : any)=>{

        this.commande = data.facture;
        this.details = data.details_facture

      })
      this.cdr.detectChanges();
    }

}
