import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { FileMetadataResponse } from '../../core/api.models';
import { DownloadService } from '../../core/download.service';
import { Download } from './download';

describe('Download', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;
  let getMetadata: Mock;
  let download: Mock;

  const id = '3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4';
  // Local time, as the page: the tests do not depend on the machine's time zone
  const now = new Date(2026, 9, 14, 10, 0);

  function metadata(expiresAt: Date, passwordProtected = false): FileMetadataResponse {
    return {
      originalName: 'vacances.mp4',
      sizeBytes: 2726297,
      expiresAt: expiresAt.toISOString(),
      passwordProtected,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    getMetadata = vi.fn().mockReturnValue(of(metadata(new Date(2026, 9, 17, 10, 0))));
    download = vi.fn().mockReturnValue(of(new Blob(['content'])));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'download/:id', component: Download }]),
        { provide: DownloadService, useValue: { getMetadata, download } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function openPage(): Promise<void> {
    harness = await RouterTestingHarness.create(`/download/${id}`);
    page = harness.routeNativeElement!;
  }

  function failWith(status: number): void {
    getMetadata.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
  }

  it('should ask the API for the file of the link', async () => {
    await openPage();

    expect(getMetadata).toHaveBeenCalledWith(id);
  });

  it('should tell the page is loading until the API answers', async () => {
    getMetadata.mockReturnValue(NEVER);

    await openPage();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Chargement');
  });

  it('should show the name and size of the file', async () => {
    await openPage();

    expect(page.querySelector('.file-name')?.textContent).toBe('vacances.mp4');
    expect(page.querySelector('.file-size')?.textContent).toBe('2,6 Mo');
  });

  describe('expiry notice', () => {
    async function openPageExpiringAt(expiresAt: Date): Promise<HTMLElement | null> {
      getMetadata.mockReturnValue(of(metadata(expiresAt)));
      await openPage();
      return page.querySelector('.callout-info, .callout-warning');
    }

    it('should inform in blue when more than 24 h remain', async () => {
      const notice = await openPageExpiringAt(new Date(2026, 9, 17, 10, 0));

      expect(notice?.className).toBe('callout-info');
      expect(notice?.textContent).toBe('Ce fichier expirera dans 3 jours.');
    });

    it('should warn in orange when less than 24 h remain', async () => {
      const notice = await openPageExpiringAt(new Date(2026, 9, 15, 9, 0));

      expect(notice?.className).toBe('callout-warning');
      expect(notice?.textContent).toBe('Ce fichier expirera demain.');
    });

    it('should count calendar days: tomorrow afternoon is "demain", even 28 h ahead', async () => {
      const notice = await openPageExpiringAt(new Date(2026, 9, 15, 14, 0));

      expect(notice?.className).toBe('callout-info');
      expect(notice?.textContent).toBe('Ce fichier expirera demain.');
    });

    it('should say "aujourd\'hui" for a file expiring tonight', async () => {
      const notice = await openPageExpiringAt(new Date(2026, 9, 14, 18, 0));

      expect(notice?.className).toBe('callout-warning');
      expect(notice?.textContent).toBe("Ce fichier expirera aujourd'hui.");
    });
  });

  describe('unavailable file', () => {
    it('should show only the expiry message when the file has expired (410)', async () => {
      failWith(410);

      await openPage();

      expect(page.querySelector('[role="alert"]')?.textContent).toBe(
        "Ce fichier n'est plus disponible en téléchargement car il a expiré.",
      );
      expect(page.querySelector('.file')).toBeNull();
    });

    // 404: unknown file · 400: id that is not a UUID
    it.each([404, 400])('should call the link invalid on a %i', async (status) => {
      failWith(status);

      await openPage();

      expect(page.querySelector('[role="alert"]')?.textContent).toBe(
        "Ce lien de téléchargement n'est pas valide.",
      );
    });

    it('should show a generic message for any other error', async () => {
      failWith(500);

      await openPage();

      expect(page.querySelector('[role="alert"]')?.textContent).toBe(
        'Une erreur est survenue, veuillez réessayer.',
      );
    });
  });

  describe('download', () => {
    let click: Mock;

    beforeEach(() => {
      // Not provided by the test DOM (jsdom), see save-file.spec.ts
      URL.createObjectURL = vi.fn().mockReturnValue('blob:file-url');
      URL.revokeObjectURL = vi.fn();
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    });

    afterEach(() => vi.restoreAllMocks());

    async function openProtectedPage(): Promise<void> {
      getMetadata.mockReturnValue(of(metadata(new Date(2026, 9, 17, 10, 0), true)));
      await openPage();
    }

    async function fillPassword(value: string): Promise<void> {
      const input = page.querySelector<HTMLInputElement>('#password')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await harness.fixture.whenStable();
    }

    async function submitForm(): Promise<void> {
      page.querySelector('form')!.dispatchEvent(new Event('submit'));
      await harness.fixture.whenStable();
    }

    function text(selector: string): string | undefined {
      return page.querySelector(selector)?.textContent?.trim();
    }

    it('should ask no password for an unprotected file, and save it under its name', async () => {
      await openPage();
      expect(page.querySelector('#password')).toBeNull();

      await submitForm();

      expect(download).toHaveBeenCalledWith(id, '');
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('vacances.mp4');
      expect(text('[role="status"]')).toBe('Fichier téléchargé.');
    });

    it('should send the password of a protected file', async () => {
      await openProtectedPage();
      await fillPassword('secret1');

      await submitForm();

      expect(download).toHaveBeenCalledWith(id, 'secret1');
    });

    it('should keep the button active and explain an empty password', async () => {
      await openProtectedPage();

      await submitForm();

      expect(download).not.toHaveBeenCalled();
      expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
      expect(text('#password-error')).toBe('Saisissez le mot de passe.');
      expect(page.querySelector('#password')!.getAttribute('aria-describedby')).toBe('password-error');
    });

    it('should refuse a password longer than 18 characters, as the API', async () => {
      await openProtectedPage();
      await fillPassword('a'.repeat(19));

      await submitForm();

      expect(download).not.toHaveBeenCalled();
      expect(text('#password-error')).toBe('Le mot de passe ne peut pas dépasser 18 caractères.');
    });

    it('should disable the button and tell the download is running until it ends', async () => {
      download.mockReturnValue(NEVER);
      await openPage();

      await submitForm();

      expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
      expect(text('[role="status"]')).toBe('Téléchargement en cours…');
    });

    it('should report a wrong password (403) and keep the file on the page', async () => {
      download.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
      await openProtectedPage();
      await fillPassword('wrong1');

      await submitForm();

      expect(text('[role="alert"]')).toBe('Mot de passe incorrect.');
      expect(page.querySelector('.file')).not.toBeNull();
      expect(click).not.toHaveBeenCalled();
    });

    it('should switch to the expired message when the file expired meanwhile (410)', async () => {
      download.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 410 })));
      await openPage();

      await submitForm();

      expect(text('[role="alert"]')).toBe(
        "Ce fichier n'est plus disponible en téléchargement car il a expiré.",
      );
      expect(page.querySelector('.file')).toBeNull();
    });

    it('should show a generic message for any other error', async () => {
      download.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await openPage();

      await submitForm();

      expect(text('[role="alert"]')).toBe('Une erreur est survenue, veuillez réessayer.');
      expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    });
  });
});
