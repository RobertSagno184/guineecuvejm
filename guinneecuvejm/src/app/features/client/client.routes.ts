import { Route } from '@angular/router';
import { clientGuard } from '../../core/guards/client.guard';

export const CLIENT_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/client-layout.component').then(
        (m) => m.ClientLayoutComponent
      ),
    canActivate: [clientGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/client-dashboard.component').then(
            (m) => m.ClientDashboardComponent
          ),
      },
      {
        path: 'catalogue',
        loadComponent: () =>
          import('./catalogue/product-catalog.component').then(
            (m) => m.ProductCatalogComponent
          ),
      },
      {
        path: 'catalogue/:id',
        loadComponent: () =>
          import('./catalogue/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent
          ),
      },
      {
        path: 'panier',
        loadComponent: () =>
          import('./cart/cart.component').then(
            (m) => m.CartComponent
          ),
      },
      {
        path: 'commande',
        loadComponent: () =>
          import('./checkout/checkout.component').then(
            (m) => m.CheckoutComponent
          ),
      },
      {
        path: 'commandes',
        loadComponent: () =>
          import('./orders/order-list.component').then(
            (m) => m.OrderListComponent
          ),
      },
      {
        path: 'commandes/:id',
        loadComponent: () =>
          import('./orders/order-detail.component').then(
            (m) => m.OrderDetailComponent
          ),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'favoris',
        loadComponent: () =>
          import('./favorites/favorites.component').then(
            (m) => m.FavoritesComponent
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/documents.component').then(
            (m) => m.DocumentsComponent
          ),
      },
    ],
  },
];
