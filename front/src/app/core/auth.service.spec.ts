import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('register should POST the email and password to /api/auth/register', () => {
    const request = { email: 'marie@mail.fr', password: 's3cretPass' };
    let completed = false;

    service.register(request).subscribe({ complete: () => (completed = true) });

    const call = httpMock.expectOne('/api/auth/register');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush(null, { status: 201, statusText: 'Created' });
    expect(completed).toBe(true);
  });
});
