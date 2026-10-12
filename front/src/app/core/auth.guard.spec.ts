import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Component({ template: 'protected page' })
class ProtectedPage {}

@Component({ template: 'login page' })
class LoginPage {}

describe('authGuard', () => {
  const isLoggedIn = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: ProtectedPage, canActivate: [authGuard] },
          { path: 'login', component: LoginPage },
        ]),
        { provide: AuthService, useValue: { isLoggedIn } },
      ],
    });
  });

  it('should open the page when a token is stored', async () => {
    isLoggedIn.set(true);

    const harness = await RouterTestingHarness.create('/');

    expect(harness.routeNativeElement?.textContent).toBe('protected page');
  });

  it('should send a visitor without token to the login page', async () => {
    isLoggedIn.set(false);

    const harness = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toBe('login page');
  });
});
