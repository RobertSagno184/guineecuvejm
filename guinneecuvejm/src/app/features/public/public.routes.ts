import { Route } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { CatalogComponent } from './catalog/catalog.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';

export const PUBLIC_ROUTES: Route[] = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'catalog',
    component: CatalogComponent,
  },
  {
    path: 'about',
    component: AboutComponent,
  },
  {
    path: 'contact',
    component: ContactComponent,
  },
];

