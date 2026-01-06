import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../services/auth/auth.state';

export const clientGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (!authState.isAuthenticated()) {
    // Rediriger vers la page de connexion avec l'URL de retour
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const role = authState.role();
  
  // Autoriser seulement les clients
  if (role === 'client') {
    return true;
  }

  // Si admin ou gérant, rediriger vers leur espace
  if (role === 'admin' || role === 'gérant') {
    router.navigate(['/admin']);
    return false;
  }

  // Sinon, rediriger vers la connexion
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

