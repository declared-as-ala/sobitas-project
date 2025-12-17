import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { GeneralService } from '../../apis/general.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [BreadcrumbsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent implements OnInit{

  coordonnees: any = JSON.parse(localStorage.getItem('coordonnees') || '{}');

  constructor(private general : GeneralService, private cdr : ChangeDetectorRef){}

  ngOnInit(): void {
    this.general.coordonnees()
    .subscribe((data : any)=>this.coordonnees = data)
    this.cdr.markForCheck();
  }

}
