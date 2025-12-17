import { Routes } from '@angular/router';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'login',
        loadChildren: () =>
          import('./auth/sign-in/sign-in.component').then(m => m.SignInComponent)
      },
      {
        path: 'compte',
        loadChildren: () =>
          import('./compte/compte.component').then(m => m.CompteComponent)
      },
      {
        path: '',
        loadChildren: () =>
          import('./public/public.routes').then(m => m.publicRoutes)
      }
    ]
  },
  { path: 'not-found', component: PageNotFoundComponent },
  { path: '**', redirectTo: 'not-found' }
];
