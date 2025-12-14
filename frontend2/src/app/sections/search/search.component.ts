import { Component } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { storage } from '../../apis/config';
import { GeneralService } from './../../apis/general.service';
import { CommonModule } from '@angular/common';
declare var $ : any
@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  imports: [ReactiveFormsModule, FormsModule,CommonModule],
})
export class SearchComponent {
  searchForm = new FormGroup({
    slug: new FormControl('0'),
    text: new FormControl(''),
  });

  constructor(private general: GeneralService, private router: Router) {}
  menu: any = JSON.parse(localStorage.getItem('menu') || '[]');

  storage = storage;

  ngOnInit(): void {

    this.general.categories().subscribe((data: any) => {
      this.menu = data;
    });
  }

  searchedProducts: any = [];
  search(e?: any) {
    if (e) {
    }
    let form = this.searchForm.value;
    this.searchedProducts = [];
    if (form.text && form.text.length > 2) {
      if (form.slug != '' && form.text) {
        this.general
          .searchProductBySubCategoryText(form.slug, form.text)
          .subscribe((data: any) => {
            this.searchedProducts = data.products;
          });
      } else {
        this.general.searchProduct(form.text).subscribe((data: any) => {

          this.searchedProducts = data.products;
        });
      }
    } else {
      this.searchedProducts = [];
    }
  }


  doSearch() {
    let form = this.searchForm.value;
    if (form.slug != '' && form.text) {
      this.router.navigate(['/produits', form.slug, form.text]);
    } else if (form.text) {
      this.router.navigate(['/produits-search', form.text]);
    }else if (form.slug != '') {
      this.router.navigate(['/category' , form.slug]);
    }
  }

  loadDorpDown() {
    setTimeout(() => {}, 0);
  }

  navigate(slug : any){
    this.searchedProducts = [];

    this.router.navigate(['/shop' , slug])
  }
  closeSearch(event : any) {




    setTimeout(() => {
      var ctx = this
      $(document).on('click', function(e : any) {
        if ( ! $(e.target).closest('#so').length && ! $(e.target).closest('#ss').length )
             $('#so').hide();
             ctx.searchedProducts = [];
      ctx.searchForm.get('text')?.setValue('')
    });
    }, 0);



  }
}
