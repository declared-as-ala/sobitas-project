import { Component, Input, OnInit } from '@angular/core';
import { storage } from '../../apis/config';
import { GeneralService } from './../../apis/general.service';
import { VenteFlashProductComponent } from '../vente-flash-product/vente-flash-product.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vente-flash',
  templateUrl: './vente-flash.component.html',
  styleUrls: ['./vente-flash.component.css'],
  imports: [CommonModule ,VenteFlashProductComponent],
})
export class VenteFlashComponent implements OnInit {
  constructor(private general: GeneralService) {}

  products: any = [];
  ngOnInit(): void {
    this.general.ventes_flash().subscribe((data: any) => {
      this.products = data;


    });
  }
}
