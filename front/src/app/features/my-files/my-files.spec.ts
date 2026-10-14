import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { FileResponse, FileStatus } from '../../core/api.models';
import { FileService } from '../../core/file.service';
import { MyFiles } from './my-files';

describe('MyFiles', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;
  let list: Mock;

  // Local time, as the page: the tests do not depend on the machine's time zone
  const now = new Date(2026, 9, 14, 10, 0);

  function file(overrides: Partial<FileResponse> = {}): FileResponse {
    return {
      id: '3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4',
      originalName: 'vacances.mp4',
      sizeBytes: 2726297,
      uploadedAt: new Date(2026, 9, 12, 15, 30).toISOString(),
      expiresAt: new Date(2026, 9, 17, 10, 0).toISOString(),
      status: 'ACTIVE',
      passwordProtected: false,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    list = vi.fn().mockReturnValue(of([file()]));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'my-files', component: MyFiles }]),
        { provide: FileService, useValue: { list } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function openPage(): Promise<void> {
    harness = await RouterTestingHarness.create('/my-files');
    page = harness.routeNativeElement!;
  }

  function rows(): HTMLElement[] {
    return Array.from(page.querySelectorAll('.file-row'));
  }

  function names(): (string | null | undefined)[] {
    return rows().map((row) => row.querySelector('.file-name')?.textContent);
  }

  function filterButton(label: string): HTMLButtonElement {
    return Array.from(page.querySelectorAll<HTMLButtonElement>('.filter')).find(
      (button) => button.textContent === label,
    )!;
  }

  async function showFilter(label: string): Promise<void> {
    filterButton(label).click();
    await harness.fixture.whenStable();
  }

  it('should offer to upload more files, even before the list is loaded', async () => {
    list.mockReturnValue(NEVER);

    await openPage();

    const add = page.querySelector<HTMLAnchorElement>('a.button-dark')!;
    expect(add.textContent).toBe('Ajouter des fichiers');
    expect(add.getAttribute('href')).toBe('/');
  });

  it('should ask the API for the files on page load', async () => {
    await openPage();

    expect(list).toHaveBeenCalledOnce();
  });

  it('should tell the page is loading until the API answers', async () => {
    list.mockReturnValue(NEVER);

    await openPage();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Chargement');
  });

  it('should show the name, size, upload date and expiry of each file', async () => {
    await openPage();

    const row = rows()[0];
    expect(row.querySelector('.file-name')?.textContent).toBe('vacances.mp4');
    expect(row.querySelector('.file-size')?.textContent?.trim()).toBe('2,6 Mo · envoyé le 12/10/2026');
    expect(row.querySelector('.expiry')?.textContent).toBe('Expire dans 3 jours');
  });

  it('should keep the order of the API, which sends the most recent first', async () => {
    list.mockReturnValue(of([file({ id: '1', originalName: 'b.txt' }), file({ id: '2', originalName: 'a.txt' })]));

    await openPage();

    expect(names()).toEqual(['b.txt', 'a.txt']);
  });

  describe('expiry', () => {
    async function expiryOf(status: FileStatus, expiresAt: Date): Promise<HTMLElement> {
      list.mockReturnValue(of([file({ status, expiresAt: expiresAt.toISOString() })]));
      await openPage();
      await showFilter('Tous');
      return rows()[0].querySelector('.expiry')!;
    }

    it('should not color an active file', async () => {
      const expiry = await expiryOf('ACTIVE', new Date(2026, 9, 17, 10, 0));

      expect(expiry.className).toBe('expiry');
    });

    it('should color in orange a file the API says is expiring soon', async () => {
      const expiry = await expiryOf('EXPIRING_SOON', new Date(2026, 9, 15, 9, 0));

      expect(expiry.classList).toContain('expiring-soon');
      expect(expiry.textContent).toBe('Expire demain');
    });

    it('should color in red an expired file', async () => {
      const expiry = await expiryOf('EXPIRED', new Date(2026, 9, 13, 10, 0));

      expect(expiry.classList).toContain('expired');
      expect(expiry.textContent).toBe('Expiré');
    });
  });

  it('should link an available file to its download page', async () => {
    await openPage();

    const access = rows()[0].querySelector<HTMLAnchorElement>('a.access')!;
    expect(access.getAttribute('href')).toBe('/download/3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4');
    expect(access.getAttribute('aria-label')).toBe('Accéder à vacances.mp4');
  });

  it('should offer no action on an expired file, only say it is gone', async () => {
    list.mockReturnValue(of([file({ status: 'EXPIRED' })]));

    await openPage();
    await showFilter('Expiré');

    const row = rows()[0];
    expect(row.querySelector('a')).toBeNull();
    expect(row.querySelector('.expired-note')?.textContent).toBe(
      "Ce fichier a expiré, il n'est plus stocké chez nous",
    );
  });

  it('should show a lock only on a password-protected file', async () => {
    list.mockReturnValue(of([file({ id: '1', passwordProtected: true }), file({ id: '2' })]));

    await openPage();

    const [protectedRow, openRow] = rows();
    expect(protectedRow.querySelector('[aria-label="Protégé par un mot de passe"]')).not.toBeNull();
    expect(openRow.querySelector('.lock')).toBeNull();
  });

  it('should say so when the account has no file yet', async () => {
    list.mockReturnValue(of([]));

    await openPage();

    expect(page.textContent).toContain("Vous n'avez encore envoyé aucun fichier.");
    expect(page.querySelector('.file-list')).toBeNull();
    expect(page.querySelector('.filters')).toBeNull();
  });

  describe('filters', () => {
    beforeEach(() => {
      list.mockReturnValue(
        of([
          file({ id: '1', originalName: 'active.txt', status: 'ACTIVE' }),
          file({ id: '2', originalName: 'soon.txt', status: 'EXPIRING_SOON' }),
          file({ id: '3', originalName: 'expired.txt', status: 'EXPIRED' }),
        ]),
      );
    });

    it('should open on "Actifs": the files not expired yet, expiring soon included', async () => {
      await openPage();

      expect(filterButton('Actifs').getAttribute('aria-pressed')).toBe('true');
      expect(filterButton('Tous').getAttribute('aria-pressed')).toBe('false');
      expect(names()).toEqual(['active.txt', 'soon.txt']);
    });

    it('should show every file under "Tous"', async () => {
      await openPage();

      await showFilter('Tous');

      expect(filterButton('Tous').getAttribute('aria-pressed')).toBe('true');
      expect(names()).toEqual(['active.txt', 'soon.txt', 'expired.txt']);
    });

    it('should show only the expired files under "Expiré"', async () => {
      await openPage();

      await showFilter('Expiré');

      expect(names()).toEqual(['expired.txt']);
    });

    it('should say so when no file is active', async () => {
      list.mockReturnValue(of([file({ status: 'EXPIRED' })]));

      await openPage();

      expect(page.textContent).toContain('Aucun fichier actif.');
      expect(page.querySelector('.file-list')).toBeNull();
    });

    it('should say so when no file has expired', async () => {
      list.mockReturnValue(of([file()]));
      await openPage();

      await showFilter('Expiré');

      expect(page.textContent).toContain('Aucun fichier expiré.');
    });
  });

  it('should show a generic message when the list cannot be loaded', async () => {
    list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    await openPage();

    expect(page.querySelector('[role="alert"]')?.textContent).toBe(
      'Une erreur est survenue, veuillez réessayer.',
    );
  });
});
