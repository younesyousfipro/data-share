import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Login } from './login';

describe('Login', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'login', component: Login }])],
    });
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
});
