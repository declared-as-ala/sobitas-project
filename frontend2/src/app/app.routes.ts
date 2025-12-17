import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { SignInComponent } from './auth/sign-in/sign-in.component';
import { CompteComponent } from './compte/compte.component';
import { ProfileComponent } from './compte/profile/profile.component';
import { HistoriqueComponent } from './compte/historique/historique.component';
import { DetailCommandeComponent } from './compte/detail-commande/detail-commande.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'login', component: SignInComponent },

      {
        path: 'compte',
        component: CompteComponent,
        children: [
          { path: '', component: ProfileComponent },
          { path: 'historique', component: HistoriqueComponent },
          { path: 'commande/:id', component: DetailCommandeComponent },
        ]
      },

      {
        path: '',
        loadChildren: () =>
          import('./public/public.routes').then(m => m.publicRoutes)
      }
    ]
  },

  { path: 'not-found', component: PageNotFoundComponent },
  { path: '**', component: PageNotFoundComponent }
];
