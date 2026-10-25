import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('userToken')
  if (token) {
    const authreq = req.clone({
      setHeaders: { token: token, AUTHORIZATION: `Bearer ${token}` }
    });
    return next(authreq);
  }
  else {
    return next(req);
  }
};
