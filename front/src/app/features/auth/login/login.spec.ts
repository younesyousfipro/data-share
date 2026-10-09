import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { AuthService } from '../../../core/auth.service';
import { Login } from './login';

describe('Login', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;
  let login: Mock;
  let navigate: Mock;

  beforeEach(() => {
    login = vi.fn().mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: Login }]),
        { provide: AuthService, useValue: { login } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  // The page reads its URL when it is created, so each test opens its own URL
  async function openPage(url = '/login'): Promise<void> {
    harness = await RouterTestingHarness.create(url);
    page = harness.routeNativeElement!;
  }

  async function fillField(id: string, value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
  }

  async function submitForm(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
  }

  async function fillValidForm(): Promise<void> {
    await fillField('email', ' marie@mail.fr ');
    await fillField('password', 's3cretPass');
  }

  function alertText(): string | null {
    return page.querySelector('[role="alert"]')?.textContent?.trim() ?? null;
  }

  function errorOf(id: string): string | null {
    return page.querySelector(`#${id}-error`)?.textContent?.trim() ?? null;
  }

  function infoText(): string | null {
    return page.querySelector('[role="status"]')?.textContent?.trim() ?? null;
  }

  it('should confirm the account creation when coming from the registration', async () => {
    await openPage('/login?registered=true');

    expect(infoText()).toBe('Votre compte a été créé, vous pouvez vous connecter.');
  });

  it('should show no information message on a direct visit', async () => {
    await openPage();

    expect(infoText()).toBeNull();
  });

  it('should show every missing field when submitting an empty form', async () => {
    await openPage();
    await submitForm();

    expect(errorOf('email')).toBe('Saisissez votre email.');
    expect(errorOf('password')).toBe('Saisissez votre mot de passe.');
  });

  it('should reject a malformed email and link the error to the field', async () => {
    await openPage();
    await fillField('email', 'marie.mail.fr');

    const input = page.querySelector('#email')!;
    expect(errorOf('email')).toBe('Saisissez un email valide.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
  });

  it('should trim spaces around the email', async () => {
    await openPage();
    await fillField('email', '  marie@mail.fr ');

    expect(page.querySelector<HTMLInputElement>('#email')!.value).toBe('marie@mail.fr');
    expect(errorOf('email')).toBeNull();
  });

  it('should accept any non-empty password, its length being checked at registration', async () => {
    await openPage();
    await fillField('email', 'marie@mail.fr');
    await fillField('password', 'short');
    await submitForm();

    expect(page.querySelectorAll('.field-error').length).toBe(0);
  });

  it('should not call the API when the form is invalid', async () => {
    await openPage();
    await submitForm();

    expect(login).not.toHaveBeenCalled();
  });

  it('should send the trimmed email and the password, then go to the home page', async () => {
    await openPage();
    await fillValidForm();
    await submitForm();

    expect(login).toHaveBeenCalledWith({ email: 'marie@mail.fr', password: 's3cretPass' });
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should announce wrong credentials on a 401', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await openPage();
    await fillValidForm();
    await submitForm();

    expect(alertText()).toBe('Email ou mot de passe incorrect.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should show a generic message on any other server error', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await openPage();
    await fillValidForm();
    await submitForm();

    expect(alertText()).toBe('Une erreur est survenue, veuillez réessayer.');
  });

  it('should send a single request on a double click', async () => {
    login.mockReturnValue(NEVER);
    await openPage();
    await fillValidForm();
    await submitForm();
    await submitForm();

    expect(login).toHaveBeenCalledTimes(1);
  });
});
