import { Routes } from '@angular/router';
import { HomeComponent } from './features/public/home/home.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'public',
    pathMatch: 'full',
  },
  {
    path: 'public',
    loadChildren: () =>
      import('./features/public/public.routes').then((m) => m.PUBLIC_ROUTES),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'client',
    loadChildren: () =>
      import('./features/client/client.routes').then((m) => m.CLIENT_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '**',
    component: HomeComponent,
  },
];
