import { Route } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';
import { adminOnlyGuard } from '../../core/guards/admin-only.guard';

export const ADMIN_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'orders',
        loadChildren: () =>
          import('./orders/orders.routes').then((m) => m.ORDERS_ROUTES),
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./customers/customers.routes').then((m) => m.CUSTOMERS_ROUTES),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./inventory/inventory.component').then(
            (m) => m.InventoryComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./reports/reports.component').then(
            (m) => m.ReportsComponent,
          ),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./users/users.routes').then((m) => m.USERS_ROUTES),
        canActivate: [adminOnlyGuard],
      },
    ],
  },
];


