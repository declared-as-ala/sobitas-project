import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.css'],
  imports: [CommonModule,RouterModule]
})
export class BreadcrumbsComponent {

  @Input() parent : any;
  @Input() parent_route : any;
  @Input() page : any;
}
