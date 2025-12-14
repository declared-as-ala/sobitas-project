import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { storage } from '../../apis/config';
import { GeneralService } from './../../apis/general.service';
import { SearchComponent } from '../search/search.component';
declare var $ : any
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styles: [],
  imports: [SearchComponent, RouterModule],
})
export class HeaderComponent implements OnInit {
  menu: any = JSON.parse(localStorage.getItem('menu') || '[]');
  panier = JSON.parse(localStorage.getItem('panier') || '[]');
  id = localStorage.getItem('id');
storage = storage
  somme_panier = 0;



  @Input() coordonnees : any



  constructor(private general: GeneralService , private router : Router) {}
  ngOnInit(): void {


    this.somme_panier = this.panier.reduce(
      (a: number, b: any) => a + b.prix_totale,
      0
    );
    this.general.loadScript();
setTimeout(() => {

}, 200);

    this.general.categories().subscribe((data: any) => {
      this.menu = data;
    });

  }


  closeMinicart(){
    setTimeout(() => {
      $('#mini_cart').removeClass('active')
    }, 0);
  }


  search2 = ''
  search2Action(){
    if(this.search2 && this.search2 != ''){
      this.router.navigate(['/produits-search', this.search2]);
    }

  }


  prevent(e : any){
    e.preventDefault()
  }

  expand(index : any){

    let id = '#categ'+index
    let sub = '#sub'+index
     setTimeout(() => {
      if ($( id ).hasClass('menu-open')) {
        $( id ).removeClass( 'menu-open');
        $( sub ).removeClass( 'displayblock');
      } else {
        $(id ).addClass( 'menu-open');
        $( sub ).addClass( 'displayblock');

      }
    }, 0);
  }

  account(){
    if(localStorage.getItem('token')){
      this.router.navigate(['/compte'])
    }else{
      this.router.navigate(['/login'])
    }
  }
}
