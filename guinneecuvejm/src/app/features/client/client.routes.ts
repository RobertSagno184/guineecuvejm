import { Route } from '@angular/router';

export const CLIENT_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/client-dashboard.component').then(
        (m) => m.ClientDashboardComponent,
      ),
  },
];


