import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Upload } from './upload';

describe('Upload', () => {
  let fixture: ComponentFixture<Upload>;
  let page: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Upload);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  // A test cannot open the real file picker: it fills the input as the browser would
  async function chooseFile(name: string, sizeBytes = 2726297): Promise<void> {
    const file = new File([''], name);
    Object.defineProperty(file, 'size', { value: sizeBytes });
    const input = page.querySelector<HTMLInputElement>('#file')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  function title(): string | undefined {
    return page.querySelector('h1')?.textContent?.trim();
  }

  function alertText(): string | null {
    return page.querySelector('[role="alert"]')?.textContent?.trim() ?? null;
  }

  it('should invite to choose a file on arrival', () => {
    expect(title()).toBe('Tu veux partager un fichier ?');
  });

  it('should open the file picker from the home button', () => {
    const click = vi.spyOn(page.querySelector<HTMLInputElement>('#file')!, 'click');

    page.querySelector<HTMLButtonElement>('[aria-label="Choisir un fichier"]')!.click();

    expect(click).toHaveBeenCalled();
  });

  it('should show the chosen file with its size', async () => {
    await chooseFile('vacances.mp4');

    expect(title()).toBe('Ajouter un fichier');
    expect(page.querySelector('.file-name')?.textContent).toBe('vacances.mp4');
    expect(page.querySelector('.file-size')?.textContent).toBe('2,6 Mo');
    expect(alertText()).toBeNull();
  });

  it('should open the file picker again from the change button', async () => {
    await chooseFile('vacances.mp4');
    const click = vi.spyOn(page.querySelector<HTMLInputElement>('#file')!, 'click');

    page.querySelector<HTMLButtonElement>('[aria-label="Changer de fichier"]')!.click();

    expect(click).toHaveBeenCalled();
  });

  it('should keep the chosen file when the file picker is cancelled', async () => {
    await chooseFile('vacances.mp4');
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

  it('should reject a file larger than 1 GB', async () => {
    await chooseFile('film.mkv', 1024 ** 3 + 1);

    expect(alertText()).toBe('La taille des fichiers est limitée à 1 Go.');
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
