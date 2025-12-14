import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PublicRoutingModule } from './public-routing.module';
import { DetailCommandeComponent } from '../compte/detail-commande/detail-commande.component';
import { AboutComponent } from './about/about.component';
import { BrandsComponent } from './brands/brands.component';
import { CardComponent } from './card/card.component';
import { CheckoutValidComponent } from './checkout-valid/checkout-valid.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { ContactComponent } from './contact/contact.component';
import { PageComponent } from './page/page.component';
import { ProductsDetailsComponent } from './products-details/products-details.component';
import { ProductsListComponent } from './products-list/products-list.component';
import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BlogsComponent } from './blogs/blogs.component';
import { BlogDetailsComponent } from './blogs/blog-details/blog-details.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { RemboursementComponent } from './remboursement/remboursement.component';
import { CGVComponent } from './cgv/cgv.component';


@NgModule({
  declarations: [
  ],
 imports: [
  CommonModule,
  PublicRoutingModule,
  SharedModule,
  FormsModule,
  ReactiveFormsModule,
  NgxPaginationModule
]

})
export class PublicModule { }
