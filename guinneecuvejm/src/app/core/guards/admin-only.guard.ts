import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../services/auth/auth.state';

/**
 * Guard qui autorise uniquement les administrateurs
 * Les gérants ne peuvent pas accéder aux routes protégées par ce guard
 */
export const adminOnlyGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  const role = authState.role();
  
  // Autoriser uniquement les administrateurs
  if (authState.isAuthenticated() && role === 'admin') {
    return true;
  }

  // Rediriger vers le dashboard si gérant ou autre
  router.navigate(['/admin/dashboard']);
  return false;
};

