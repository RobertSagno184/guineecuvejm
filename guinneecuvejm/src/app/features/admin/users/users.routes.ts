import { Route } from '@angular/router';

export const USERS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./users-list/users-list.component').then(
        (m) => m.UsersListComponent,
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./user-form/user-form.component').then(
        (m) => m.UserFormComponent,
      ),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./user-form/user-form.component').then(
        (m) => m.UserFormComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./user-detail/user-detail.component').then(
        (m) => m.UserDetailComponent,
      ),
  },
];

