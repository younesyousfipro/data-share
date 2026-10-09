import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { AuthService } from '../../../core/auth.service';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let page: HTMLElement;
  let register: Mock;
  let navigate: Mock;

  beforeEach(async () => {
    register = vi.fn().mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Register);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  async function fillField(id: string, value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submitForm(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function fillValidForm(): Promise<void> {
    await fillField('email', ' marie@mail.fr ');
    await fillField('password', 's3cretPass');
    await fillField('confirm-password', 's3cretPass');
  }

  function alertText(): string | null {
    return page.querySelector('[role="alert"]')?.textContent?.trim() ?? null;
  }

  function errorOf(id: string): string | null {
    return page.querySelector(`#${id}-error`)?.textContent?.trim() ?? null;
  }

  it('should show no error before the user leaves a field', () => {
    expect(page.querySelectorAll('.field-error').length).toBe(0);
  });

  it('should show every missing field when submitting an empty form', async () => {
    await submitForm();

    expect(errorOf('email')).toBe('Saisissez votre email.');
    expect(errorOf('password')).toBe('Saisissez un mot de passe.');
    expect(errorOf('confirm-password')).toBe('Confirmez votre mot de passe.');
  });

  it('should reject a malformed email and link the error to the field', async () => {
    await fillField('email', 'marie.mail.fr');

    const input = page.querySelector('#email')!;
    expect(errorOf('email')).toBe('Saisissez un email valide.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
  });

  it('should trim spaces around the email', async () => {
    await fillField('email', '  marie@mail.fr ');

    expect(page.querySelector<HTMLInputElement>('#email')!.value).toBe('marie@mail.fr');
    expect(errorOf('email')).toBeNull();
  });

  it.each(['1234567', '1234567890123456789'])(
    'should reject the password "%s", outside 8 to 18 characters',
    async (password) => {
      await fillField('password', password);

      expect(errorOf('password')).toBe('Le mot de passe doit contenir entre 8 et 18 caractères.');
    },
  );

  it('should reject a confirmation that differs from the password', async () => {
    await fillField('password', 's3cretPass');
    await fillField('confirm-password', 's3cretPasz');

    expect(errorOf('confirm-password')).toBe('Les mots de passe ne correspondent pas.');
  });

  it('should show no error when every field is valid', async () => {
    await fillField('email', 'marie@mail.fr');
    await fillField('password', 's3cretPass');
    await fillField('confirm-password', 's3cretPass');
    await submitForm();

    expect(page.querySelectorAll('.field-error').length).toBe(0);
  });

  it('should not call the API when the form is invalid', async () => {
    await submitForm();

    expect(register).not.toHaveBeenCalled();
  });

  it('should send the trimmed email and the password only, then go to the login page', async () => {
    await fillValidForm();
    await submitForm();

    expect(register).toHaveBeenCalledWith({ email: 'marie@mail.fr', password: 's3cretPass' });
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should announce that the email is already used on a 409', async () => {
    register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await fillValidForm();
    await submitForm();

    expect(alertText()).toBe('Cet email est déjà utilisé.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should show a generic message on any other server error', async () => {
    register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await fillValidForm();
    await submitForm();

    expect(alertText()).toBe('Une erreur est survenue, veuillez réessayer.');
  });

  it('should send a single request on a double click', async () => {
    register.mockReturnValue(NEVER);
    await fillValidForm();
    await submitForm();
    await submitForm();

    expect(register).toHaveBeenCalledTimes(1);
  });
});
