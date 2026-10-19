import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// No token on public routes: Spring checks any token it receives, so an expired
// one would turn a public call into a 401
const PUBLIC_ROUTES = ['/api/auth/', '/api/download/'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (PUBLIC_ROUTES.some((route) => request.url.startsWith(route))) {
    return next(request);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const authorizedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { expired: true } });
      }
      return throwError(() => error);
    }),
  );
};
