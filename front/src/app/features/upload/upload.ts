import { Component, computed, signal } from '@angular/core';
import { FileSizePipe } from '../../shared/file-size.pipe';

// Same rules as the API (multipart limit, FileService): checked here for comfort only
const MAX_SIZE_BYTES = 1024 ** 3;
const FORBIDDEN_EXTENSIONS = ['exe', 'bat', 'cmd', 'com', 'msi', 'sh', 'ps1', 'vbs', 'jar'];

@Component({
  selector: 'app-upload',
  imports: [FileSizePipe],
  styleUrl: './upload.css',
  templateUrl: './upload.html',
})
export class Upload {
  protected readonly file = signal<File | null>(null);

  protected readonly fileError = computed(() => {
    const file = this.file();
    if (file === null) {
      return null;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'La taille des fichiers est limitée à 1 Go.';
    }
    if (FORBIDDEN_EXTENSIONS.includes(extensionOf(file.name))) {
      return 'Les fichiers exécutables et les scripts (.exe, .bat, .sh…) ne sont pas acceptés.';
    }
    return null;
  });

  // Cancelling the file picker gives no file: the previous choice is kept
  protected selectFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (file) {
      this.file.set(file);
    }
  }
}

// Last extension only, as the API: "facture.pdf.EXE" gives "exe"
function extensionOf(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot < 0 ? '' : name.slice(lastDot + 1).toLowerCase();
}
