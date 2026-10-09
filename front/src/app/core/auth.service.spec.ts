import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

// The service reads localStorage when it is created: each test injects it
// itself, after preparing localStorage if needed.
describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('register should POST the email and password to /api/auth/register', () => {
    const service = TestBed.inject(AuthService);
    const request = { email: 'marie@mail.fr', password: 's3cretPass' };
    let completed = false;

    service.register(request).subscribe({ complete: () => (completed = true) });

    const call = httpMock.expectOne('/api/auth/register');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush(null, { status: 201, statusText: 'Created' });
    expect(completed).toBe(true);
  });

  it('login should POST the credentials and store the returned token', () => {
    const service = TestBed.inject(AuthService);
    const request = { email: 'marie@mail.fr', password: 's3cretPass' };
    let completed = false;

    service.login(request).subscribe({ complete: () => (completed = true) });

    const call = httpMock.expectOne('/api/auth/login');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({ token: 'header.payload.signature' });
    expect(completed).toBe(true);
    expect(localStorage.getItem('token')).toBe('header.payload.signature');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('login should store nothing when the credentials are rejected', () => {
    const service = TestBed.inject(AuthService);

    service.login({ email: 'marie@mail.fr', password: 'wrongPass' }).subscribe({ error: () => {} });

    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem('token')).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('isLoggedIn should be true when a token was stored by a previous visit', () => {
    localStorage.setItem('token', 'header.payload.signature');

    const service = TestBed.inject(AuthService);

    expect(service.isLoggedIn()).toBe(true);
  });
});
