import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'login',
        loadComponent: () => import('./auth/sign-in/sign-in.component').then(m => m.SignInComponent)
      },
      {
        path: 'compte',
        loadComponent: () => import('./compte/compte.component').then(m => m.CompteComponent),
        children: [
          {
            path: '',
            loadComponent: () => import('./compte/profile/profile.component').then(m => m.ProfileComponent)
          },
          {
            path: 'historique',
            loadComponent: () => import('./compte/historique/historique.component').then(m => m.HistoriqueComponent)
          },
          {
            path: 'commande/:id',
            loadComponent: () => import('./compte/detail-commande/detail-commande.component').then(m => m.DetailCommandeComponent)
          }
        ]
      },
      {
        path: '',
        loadChildren: () => import('./public/public.routes').then(m => m.publicRoutes)
      }
    ]
  },
  { path: 'not-found', component: PageNotFoundComponent },
  { path: '**', redirectTo: 'not-found' }
];
