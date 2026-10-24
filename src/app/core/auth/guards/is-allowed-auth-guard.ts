import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../../services/toast-service';

export const isAllowedAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const toastService = inject(ToastService);

  if (localStorage.getItem('userToken')) {
    return true;
  } else {
    toastService.warning('Authentication Required', 'Please sign in to access The Reading Room.');
    return router.parseUrl('/sign-in');
  }
};

