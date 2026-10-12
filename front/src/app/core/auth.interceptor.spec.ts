import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Mock } from 'vitest';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let navigate: Mock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function authorizationOf(url: string): string | null {
    http.get(url).subscribe();
    const call = httpMock.expectOne(url);
    call.flush(null);
    return call.request.headers.get('Authorization');
  }

  it('should send the stored token to a protected route', () => {
    localStorage.setItem('token', 'header.payload.signature');

    expect(authorizationOf('/api/files')).toBe('Bearer header.payload.signature');
  });

  it('should send no token to the public routes', () => {
    localStorage.setItem('token', 'header.payload.signature');

    expect(authorizationOf('/api/auth/login')).toBeNull();
    expect(authorizationOf('/api/download/3f2b9c1e')).toBeNull();
  });

  it('should send the request unchanged when no token is stored', () => {
    expect(authorizationOf('/api/files')).toBeNull();
  });

  it('should forget the token and go to the login page on a 401', () => {
    localStorage.setItem('token', 'expired.token');
    let status: number | undefined;

    http.get('/api/files').subscribe({ error: (error) => (status = error.status) });
    httpMock.expectOne('/api/files').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(status).toBe(401);
  });

  it('should leave a 401 from the login route to the login page', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => {} });
    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should keep the token on any other error', () => {
    localStorage.setItem('token', 'header.payload.signature');

    http.get('/api/files').subscribe({ error: () => {} });
    httpMock.expectOne('/api/files').flush(null, { status: 500, statusText: 'Server Error' });

    expect(localStorage.getItem('token')).toBe('header.payload.signature');
    expect(navigate).not.toHaveBeenCalled();
  });
});
