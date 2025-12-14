import { Routes } from '@angular/router';

import { ProductsListComponent } from './products-list/products-list.component';
import { ProductsDetailsComponent } from './products-details/products-details.component';
import { ContactComponent } from './contact/contact.component';
import { BrandsComponent } from './brands/brands.component';
import { CardComponent } from './card/card.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { CheckoutValidComponent } from './checkout-valid/checkout-valid.component';
import { DetailCommandeComponent } from '../compte/detail-commande/detail-commande.component';
import { BlogsComponent } from './blogs/blogs.component';
import { BlogDetailsComponent } from './blogs/blog-details/blog-details.component';
import { PageComponent } from './page/page.component';
import { RemboursementComponent } from './remboursement/remboursement.component';
import { CGVComponent } from './cgv/cgv.component';
import { PageNotFoundComponent } from '../page-not-found/page-not-found.component';

export const PUBLIC_ROUTES: Routes = [

  { path: 'shop', component: ProductsListComponent },
  { path: 'categorie/:slug_cat', component: ProductsListComponent },
  { path: 'category/:slug_sub', component: ProductsListComponent },
  { path: 'produits-search/:tag', component: ProductsListComponent },
  { path: 'produits/:slug_sub/:tag', component: ProductsListComponent },
  { path: 'brand/:nom/:id_brand', component: ProductsListComponent },

  { path: 'contact', component: ContactComponent },
  { path: 'marques', component: BrandsComponent },

  { path: 'shop/:slug', component: ProductsDetailsComponent },

  { path: 'cart', component: CardComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'checkout-valid', component: CheckoutValidComponent },

  { path: 'commande/:id', component: DetailCommandeComponent },

  { path: 'blogs', component: BlogsComponent },
  { path: 'blogs/:slug', component: BlogDetailsComponent },

  { path: 'page/:slug', component: PageComponent },

  { path: 'remboursement', component: RemboursementComponent },
  { path: 'condition-ventes', component: CGVComponent },

  { path: 'pack/:packs', component: ProductsListComponent },

  // Redirects
  { path: 'proteine-tunisie-العربية', redirectTo: 'category/creatine', pathMatch: 'full' },
  { path: 'category/creatine/19', redirectTo: 'category/creatine', pathMatch: 'full' },
    {
    path: '**',
    component: PageNotFoundComponent,
    data: { status: 404 }
  }

];
