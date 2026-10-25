import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast-service';
import { catchError, EMPTY, throwError } from 'rxjs';
import { ApiErrorResponse } from '../models/api.models';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let title = 'Error';
      let message = 'An unexpected error occurred. Please try again.';

      if (error.status === 0) {
        title = 'Network Offline';
        message = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.error) {
        const body = error.error as ApiErrorResponse;

        // Route Posts API standard response shape: { success: false, message: "...", errors: "..." }
        if (typeof body.errors === 'string' && body.errors.trim()) {
          message = body.errors.replace(/"/g, '').split(',').join(' • ');
        } else if (typeof body.message === 'string' && body.message.trim()) {
          message = body.message.replace(/"/g, '').split(',').join(' • ');
        }

        if (error.status === 400) {
          title = 'Validation Error';
        } else if (error.status === 401) {
          title = 'Authentication Failed';
        } else if (error.status === 403) {
          title = 'Access Forbidden';
        } else if (error.status === 404) {
          title = 'Resource Not Found';
        } else if (error.status >= 500) {
          title = 'Server Error';
          message = 'Server is currently experiencing issues. Please try again later.';
        }
      }

      toastService.error(title, message);

      return throwError(() => error);
    })
  );
};
