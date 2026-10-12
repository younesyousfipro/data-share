import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { FileResponse } from '../../core/api.models';
import { FileService } from '../../core/file.service';
import { Upload } from './upload';

describe('Upload', () => {
  let fixture: ComponentFixture<Upload>;
  let page: HTMLElement;
  let upload: Mock;

  const uploadedFile: FileResponse = {
    id: '3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4',
    originalName: 'vacances.mp4',
    sizeBytes: 2726297,
    uploadedAt: '2026-10-12T14:00:00Z',
    expiresAt: '2026-10-19T14:00:00Z',
    status: 'ACTIVE',
    passwordProtected: false,
  };

  beforeEach(async () => {
    upload = vi.fn().mockReturnValue(of(uploadedFile));
    TestBed.configureTestingModule({
      providers: [{ provide: FileService, useValue: { upload } }],
    });
    fixture = TestBed.createComponent(Upload);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  // A test cannot open the real file picker: it fills the input as the browser would
  async function chooseFile(name = 'vacances.mp4', sizeBytes = 2726297): Promise<File> {
    const file = new File([''], name);
    Object.defineProperty(file, 'size', { value: sizeBytes });
    const input = page.querySelector<HTMLInputElement>('#file')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    return file;
  }

  async function fillPassword(value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>('#password')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function chooseExpiration(label: string): Promise<void> {
    const select = page.querySelector<HTMLSelectElement>('#expiration')!;
    select.selectedIndex = [...select.options].findIndex((option) => option.text.trim() === label);
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submitForm(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function title(): string | undefined {
    return page.querySelector('h1')?.textContent?.trim();
  }

  function alertText(): string | null {
    return page.querySelector('[role="alert"]')?.textContent?.trim() ?? null;
  }

  function uploadButton(): HTMLButtonElement {
    return page.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  describe('file choice', () => {
    it('should invite to choose a file on arrival', () => {
      expect(title()).toBe('Tu veux partager un fichier ?');
    });

    it('should open the file picker from the home button', () => {
      const click = vi.spyOn(page.querySelector<HTMLInputElement>('#file')!, 'click');

      page.querySelector<HTMLButtonElement>('[aria-label="Choisir un fichier"]')!.click();

      expect(click).toHaveBeenCalled();
    });

    it('should show the chosen file with its size', async () => {
      await chooseFile();

      expect(title()).toBe('Ajouter un fichier');
      expect(page.querySelector('.file-name')?.textContent).toBe('vacances.mp4');
      expect(page.querySelector('.file-size')?.textContent).toBe('2,6 Mo');
      expect(alertText()).toBeNull();
    });

    it('should open the file picker again from the change button', async () => {
      await chooseFile();
      const click = vi.spyOn(page.querySelector<HTMLInputElement>('#file')!, 'click');

      page.querySelector<HTMLButtonElement>('[aria-label="Changer de fichier"]')!.click();

      expect(click).toHaveBeenCalled();
    });

    it('should keep the chosen file when the file picker is cancelled', async () => {
      await chooseFile();
      const input = page.querySelector<HTMLInputElement>('#file')!;
      Object.defineProperty(input, 'files', { value: [] });
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(page.querySelector('.file-name')?.textContent).toBe('vacances.mp4');
    });

    it('should accept a file of exactly 1 GB', async () => {
      await chooseFile('film.mkv', 1024 ** 3);

      expect(alertText()).toBeNull();
    });

    it('should reject a file larger than 1 GB and disable the upload', async () => {
      await chooseFile('film.mkv', 1024 ** 3 + 1);

      expect(alertText()).toBe('La taille des fichiers est limitée à 1 Go.');
      expect(uploadButton().disabled).toBe(true);
    });

    it('should reject a forbidden last extension, whatever its case', async () => {
      await chooseFile('facture.pdf.EXE');

      expect(alertText()).toBe(
        'Les fichiers exécutables et les scripts (.exe, .bat, .sh…) ne sont pas acceptés.',
      );
    });

    it('should accept a forbidden extension that is not the last one', async () => {
      await chooseFile('archive.exe.zip');

      expect(alertText()).toBeNull();
    });

    it('should accept a file without extension', async () => {
      await chooseFile('README');

      expect(alertText()).toBeNull();
    });
  });

  describe('options and sending', () => {
    it('should keep the file for a week by default', async () => {
      await chooseFile();

      const select = page.querySelector<HTMLSelectElement>('#expiration')!;
      expect(select.options[select.selectedIndex].text.trim()).toBe('Une semaine');
    });

    it('should send the file without password and for a week by default', async () => {
      const file = await chooseFile();
      await submitForm();

      expect(upload).toHaveBeenCalledWith({ file, password: '', expirationDays: 7 });
    });

    it('should send the chosen password and expiration', async () => {
      const file = await chooseFile();
      await fillPassword('secret1');
      await chooseExpiration('3 jours');
      await submitForm();

      expect(upload).toHaveBeenCalledWith({ file, password: 'secret1', expirationDays: 3 });
    });

    it('should reject a password shorter than 6 characters', async () => {
      await chooseFile();
      await fillPassword('short');
      await submitForm();

      expect(page.querySelector('#password-error')?.textContent).toBe(
        'Le mot de passe doit contenir entre 6 et 18 caractères.',
      );
      expect(upload).not.toHaveBeenCalled();
    });

    it('should reject a password longer than 18 characters', async () => {
      await chooseFile();
      await fillPassword('a'.repeat(19));
      await submitForm();

      expect(upload).not.toHaveBeenCalled();
    });

    it('should not send a rejected file', async () => {
      await chooseFile('script.sh');
      await submitForm();

      expect(upload).not.toHaveBeenCalled();
    });

    it('should announce the sending and send a single request on a double click', async () => {
      upload.mockReturnValue(NEVER);
      await chooseFile();
      await submitForm();
      await submitForm();

      expect(upload).toHaveBeenCalledTimes(1);
      expect(page.querySelector('[role="status"]')?.textContent?.trim()).toBe(
        'Envoi en cours, ne ferme pas cette page…',
      );
      expect(uploadButton().disabled).toBe(true);
    });

    it('should tell how long the file is kept once sent', async () => {
      await chooseFile();
      await chooseExpiration('3 jours');
      await submitForm();

      expect(page.querySelector('.success')?.textContent?.trim()).toBe(
        'Félicitations, ton fichier sera conservé chez nous pendant 3 jours !',
      );
      expect(page.querySelector('form')).toBeNull();
    });
  });

  describe('share link', () => {
    let writeText: Mock;

    beforeEach(() => {
      writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    });

    async function sendFile(): Promise<void> {
      await chooseFile();
      await submitForm();
    }

    // Waits for the clipboard answer, then for the page to show the message
    async function copyLink(): Promise<void> {
      page.querySelector<HTMLButtonElement>('.copy-button')!.click();
      await writeText.mock.results[0].value.catch(() => {});
      await fixture.whenStable();
    }

    function copyMessage(): string | undefined {
      return page.querySelector('[role="status"]')?.textContent?.trim();
    }

    it('should show the link to the download page of the file', async () => {
      await sendFile();

      const link = page.querySelector<HTMLAnchorElement>('.share-link a')!;
      const expected = `${window.location.origin}/download/${uploadedFile.id}`;
      expect(link.textContent).toBe(expected);
      expect(link.getAttribute('href')).toBe(expected);
    });

    it('should copy the link and confirm it', async () => {
      await sendFile();
      await copyLink();

      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/download/${uploadedFile.id}`);
      expect(copyMessage()).toBe('Lien copié.');
    });

    it('should start again from the home page with a fresh form', async () => {
      await chooseFile();
      await fillPassword('secret1');
      await chooseExpiration('3 jours');
      await submitForm();

      page.querySelector<HTMLButtonElement>('.restart-button')!.click();
      await fixture.whenStable();
      expect(title()).toBe('Tu veux partager un fichier ?');

      await chooseFile('autre.pdf');
      const select = page.querySelector<HTMLSelectElement>('#expiration')!;
      expect(page.querySelector<HTMLInputElement>('#password')!.value).toBe('');
      expect(select.options[select.selectedIndex].text.trim()).toBe('Une semaine');
    });

    it('should explain what to do when the copy is refused', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      await sendFile();
      await copyLink();

      expect(copyMessage()).toBe('Copie impossible : sélectionne le lien pour le copier.');
    });
  });

  describe('server errors', () => {
    async function sendAndFailWith(status: number): Promise<void> {
      upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      await chooseFile();
      await submitForm();
    }

    it('should explain a file too large for the server', async () => {
      await sendAndFailWith(413);

      expect(alertText()).toBe('La taille des fichiers est limitée à 1 Go.');
    });

    it('should explain a file refused by the server', async () => {
      await sendAndFailWith(400);

      expect(alertText()).toBe('Le serveur a refusé ce fichier : vérifiez son nom et son type.');
    });

    it('should show a generic message on any other error and allow a new try', async () => {
      await sendAndFailWith(500);

      expect(alertText()).toBe('Une erreur est survenue, veuillez réessayer.');
      expect(uploadButton().disabled).toBe(false);
    });

    it('should clear the server error when another file is chosen', async () => {
      await sendAndFailWith(500);
      await chooseFile('autre.pdf');

      expect(alertText()).toBeNull();
    });
  });
});
