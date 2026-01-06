import { Route } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout.component';

export const PUBLIC_ROUTES: Route[] = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./home/home.component').then((m) => m.HomeComponent),
        data: { title: 'Guinée Cuve Plastique - Expert en cuves plastique' }
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./catalog/catalog.component').then((m) => m.CatalogComponent),
        data: { title: 'Notre Catalogue de Cuves' }
      },
      {
        path: 'catalog/:id',
        loadComponent: () =>
          import('./catalog/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent
          )
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./about/about.component').then((m) => m.AboutComponent),
        data: { title: 'À propos - Notre Histoire' }
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./services/services.component').then((m) => m.ServicesComponent),
        data: { title: 'Nos Services' }
      },
      {
        path: 'testimonials',
        loadComponent: () =>
          import('./testimonials/testimonials.component').then(
            (m) => m.TestimonialsComponent
          ),
        data: { title: 'Témoignages Clients' }
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./contact/contact.component').then((m) => m.ContactComponent),
        data: { title: 'Contactez-nous' }
      },
      {
        path: 'mentions-legales',
        loadComponent: () =>
          import('./legal/legal.component').then((m) => m.LegalComponent),
        data: { title: 'Mentions Légales' }
      },
      {
        path: 'politique-confidentialite',
        loadComponent: () =>
          import('./privacy/privacy.component').then((m) => m.PrivacyComponent),
        data: { title: 'Politique de Confidentialité' }
      }
    ]
  }
];
