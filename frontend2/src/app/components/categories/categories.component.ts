import { Component, Input, OnInit } from '@angular/core';
import { storage } from '../../apis/config';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css'],
  imports: [CommonModule, RouterModule, NgOptimizedImage],
})
export class CategoriesComponent implements OnInit {

  @Input() categories : any;
  storage  = storage


  ngOnInit(): void {

  }
}
