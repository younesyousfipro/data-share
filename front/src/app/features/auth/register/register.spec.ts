import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([])],
    }).compileComponents();

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
});
