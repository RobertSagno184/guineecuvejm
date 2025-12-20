import { Route } from '@angular/router';

export const ADMIN_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
  },
];


