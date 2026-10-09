import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RegisterRequest } from './api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>('/api/auth/register', request);
  }
}
