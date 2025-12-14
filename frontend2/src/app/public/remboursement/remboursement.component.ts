import { Component } from '@angular/core';
import { GeneralService } from './../../apis/general.service';
import { CommonModule } from '@angular/common';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-remboursement',
  templateUrl: './remboursement.component.html',
  styleUrls: ['./remboursement.component.css'],
  imports: [CommonModule, BreadcrumbsComponent]
})
export class RemboursementComponent {
  coordonnees: any = JSON.parse(localStorage.getItem('coordonnees') || '{}');

  constructor(private general : GeneralService){}

  ngOnInit(): void {
    this.general.coordonnees()
    .subscribe((data : any)=>this.coordonnees = data)
  }
}
