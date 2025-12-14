import { Component, OnInit } from '@angular/core';
import { GeneralService } from './../../apis/general.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [BreadcrumbsComponent],
})
export class AboutComponent implements OnInit{

  coordonnees: any = JSON.parse(localStorage.getItem('coordonnees') || '{}');

  constructor(private general : GeneralService){}

  ngOnInit(): void {
    this.general.coordonnees()
    .subscribe((data : any)=>this.coordonnees = data)
  }

}
