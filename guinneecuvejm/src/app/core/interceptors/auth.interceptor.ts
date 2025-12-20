import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // TODO: ajouter le token d'authentification dans les headers
  return next(req);
};


