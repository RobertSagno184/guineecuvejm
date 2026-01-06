import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../services/auth/auth.state';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  // Rediriger vers la page de connexion avec l'URL de retour
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};


