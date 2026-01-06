import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../services/auth/auth.state';

export const adminGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  const role = authState.role();
  
  // Autoriser uniquement les administrateurs et gérants
  if (authState.isAuthenticated() && (role === 'admin' || role === 'gérant')) {
    return true;
  }

  // Rediriger vers la page publique si non autorisé
  router.navigate(['/public']);
  return false;
};


