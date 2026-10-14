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
  let page: HTMLElement;
  let getMetadata: Mock;

  const id = '3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4';
  // Local time, as the page: the tests do not depend on the machine's time zone
  const now = new Date(2026, 9, 14, 10, 0);

  function metadata(expiresAt: Date): FileMetadataResponse {
    return {
      originalName: 'vacances.mp4',
      sizeBytes: 2726297,
      expiresAt: expiresAt.toISOString(),
      passwordProtected: false,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    getMetadata = vi.fn().mockReturnValue(of(metadata(new Date(2026, 9, 17, 10, 0))));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'download/:id', component: Download }]),
        { provide: DownloadService, useValue: { getMetadata } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function openPage(): Promise<void> {
    const harness = await RouterTestingHarness.create(`/download/${id}`);
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
});
