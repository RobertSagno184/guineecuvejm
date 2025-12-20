import { CanActivateFn } from '@angular/router';

export const publicGuard: CanActivateFn = (route, state) => {
  // Garde publique : on laisse tout passer par défaut
  return true;
};


