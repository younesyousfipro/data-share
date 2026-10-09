import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest } from './api.models';

const TOKEN_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly token = signal(localStorage.getItem(TOKEN_KEY));

  readonly isLoggedIn = computed(() => this.token() !== null);

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>('/api/auth/register', request);
  }

  login(request: LoginRequest): Observable<void> {
    return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
      tap(({ token }) => {
        localStorage.setItem(TOKEN_KEY, token);
        this.token.set(token);
      }),
      map(() => undefined),
    );
  }
}
