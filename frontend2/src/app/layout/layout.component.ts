import { Component } from '@angular/core';
import { GeneralService } from '../apis/general.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../sections/header/header.component';
import { FooterComponent } from '../sections/footer/footer.component';
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  imports: [CommonModule, RouterModule, HeaderComponent,FooterComponent],
})
export class LayoutComponent  {
  coordonnees: any = JSON.parse(localStorage.getItem('coordonnees') || '{}');
  constructor(private general: GeneralService) {}


  ngOnInit(): void {
    this.general.coordonnees().subscribe((data: any) => {
      this.coordonnees = data;
      localStorage.setItem('coordonnees', JSON.stringify(this.coordonnees));


    });
  }
}
