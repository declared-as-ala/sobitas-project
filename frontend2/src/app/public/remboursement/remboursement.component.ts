import { ChangeDetectorRef, Component } from '@angular/core';
import { GeneralService } from '../../apis/general.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-remboursement',
  templateUrl: './remboursement.component.html',
  styleUrls: ['./remboursement.component.css'],
  imports: [BreadcrumbsComponent]
})
export class RemboursementComponent {
  coordonnees: any = JSON.parse(localStorage.getItem('coordonnees') || '{}');

  constructor(private general : GeneralService, private cdr : ChangeDetectorRef){}

  ngOnInit(): void {
    this.general.coordonnees()
    .subscribe((data : any)=>this.coordonnees = data)
    this.cdr.detectChanges();
  }
}
