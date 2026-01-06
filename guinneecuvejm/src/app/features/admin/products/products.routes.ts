import { Route } from '@angular/router';

export const PRODUCTS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./products-list/products-list.component').then(
        (m) => m.ProductsListComponent,
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./product-form/product-form.component').then(
        (m) => m.ProductFormComponent,
      ),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./product-form/product-form.component').then(
        (m) => m.ProductFormComponent,
      ),
  },
];

