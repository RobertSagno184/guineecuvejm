import { CanActivateFn } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  // TODO: vérifier le rôle admin de l'utilisateur connecté
  console.warn('adminGuard utilisé sans logique réelle, à implémenter.');
  return true;
};


