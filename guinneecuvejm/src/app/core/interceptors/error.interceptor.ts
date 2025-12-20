import { HttpInterceptorFn } from '@angular/common/http';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // TODO: intercepter les erreurs HTTP et centraliser la gestion
  return next(req);
};



