import { Component } from '@angular/core';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-cgv',
  templateUrl: './cgv.component.html',
  styleUrls: ['./cgv.component.css'],
  imports: [
  BreadcrumbsComponent,CommonModule
  ]
})
export class CGVComponent {

}
