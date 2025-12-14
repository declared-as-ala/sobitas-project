import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailCommandeComponent } from '../compte/detail-commande/detail-commande.component';
import { AboutComponent } from './about/about.component';
import { BrandsComponent } from './brands/brands.component';
import { CardComponent } from './card/card.component';
import { CheckoutValidComponent } from './checkout-valid/checkout-valid.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { ContactComponent } from './contact/contact.component';
import { ProductsDetailsComponent } from './products-details/products-details.component';
import { ProductsListComponent } from './products-list/products-list.component';
import { BlogsComponent } from './blogs/blogs.component';
import { BlogDetailsComponent } from './blogs/blog-details/blog-details.component';
import { PageComponent } from './page/page.component';
import { SignInComponent } from '../auth/sign-in/sign-in.component';
import { CompteComponent } from '../compte/compte.component';
import { ProfileComponent } from '../compte/profile/profile.component';
import { HistoriqueComponent } from '../compte/historique/historique.component';
import { PageNotFoundComponent } from '../page-not-found/page-not-found.component';
import { RemboursementComponent } from './remboursement/remboursement.component';
import { CGVComponent } from './cgv/cgv.component';

const routes: Routes = [

  { path: 'shop', component: ProductsListComponent },
  { path: 'categorie/:slug_cat', component: ProductsListComponent },
  { path: 'category/:slug_sub', component: ProductsListComponent },
  { path: 'produits-search/:tag', component: ProductsListComponent },
  { path: 'produits/:slug_sub/:tag', component: ProductsListComponent },
  { path: 'brand/:nom/:id_brand', component: ProductsListComponent },
  { path: 'contact', component: ContactComponent },
  {path : 'marques' , component : BrandsComponent},
  {path : 'shop/:slug' , component : ProductsDetailsComponent},
  {path : 'cart' , component : CardComponent},
  {path : 'checkout' , component :CheckoutComponent},
  {path : 'checkout-valid' , component : CheckoutValidComponent},
  {path : 'commande/:id' , component : DetailCommandeComponent},
  { path: 'blogs', component: BlogsComponent },
  { path: 'remboursement', component: RemboursementComponent },
  { path: 'condition-ventes', component: CGVComponent },
  { path: 'blogs/:slug', component: BlogDetailsComponent },
  {path : 'page/:slug' , component : PageComponent},
  { path: 'pack/:packs', component: ProductsListComponent },
  { path : 'proteine-tunisie-العربية', redirectTo : 'category/creatine' , pathMatch:'full'},
  // { path : 'creatine', redirectTo : 'category/creatine' , pathMatch:'full'},
  { path : 'category/creatine/19', redirectTo : 'category/creatine' , pathMatch:'full'},

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule { }
