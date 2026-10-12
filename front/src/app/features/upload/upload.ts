import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileResponse } from '../../core/api.models';
import { FileService } from '../../core/file.service';
import { FileSizePipe } from '../../shared/file-size.pipe';

// Same rules as the API (multipart limit, FileService, UploadRequestDTO): checked here for comfort only
const MAX_SIZE_BYTES = 1024 ** 3;
const FORBIDDEN_EXTENSIONS = ['exe', 'bat', 'cmd', 'com', 'msi', 'sh', 'ps1', 'vbs', 'jar'];

const EXPIRATION_CHOICES = [
  { days: 1, label: 'Une journée' },
  { days: 2, label: '2 jours' },
  { days: 3, label: '3 jours' },
  { days: 4, label: '4 jours' },
  { days: 5, label: '5 jours' },
  { days: 6, label: '6 jours' },
  { days: 7, label: 'Une semaine' },
];

@Component({
  selector: 'app-upload',
  imports: [FileSizePipe, ReactiveFormsModule],
  styleUrl: './upload.css',
  templateUrl: './upload.html',
})
export class Upload {
  private readonly fileService = inject(FileService);

  protected readonly expirationChoices = EXPIRATION_CHOICES;

  protected readonly file = signal<File | null>(null);
  protected readonly sending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly uploadedFile = signal<FileResponse | null>(null);

  // Validators.minLength accepts an empty value: the password stays optional
  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.minLength(6), Validators.maxLength(18)]],
    expirationDays: [7],
  });

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
      this.serverError.set(null);
    }
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    const file = this.file();
    if (file === null || this.fileError() !== null || this.form.invalid || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.serverError.set(null);
    this.fileService.upload({ file, ...this.form.getRawValue() }).subscribe({
      next: (uploadedFile) => this.uploadedFile.set(uploadedFile),
      error: (error: HttpErrorResponse) => {
        this.sending.set(false);
        this.serverError.set(uploadErrorMessage(error.status));
      },
    });
  }

  protected passwordError(): string | null {
    const password = this.form.controls.password;
    return password.touched && password.invalid
      ? 'Le mot de passe doit contenir entre 6 et 18 caractères.'
      : null;
  }

  protected keptFor(): string {
    const days = this.form.controls.expirationDays.value;
    return EXPIRATION_CHOICES.find((choice) => choice.days === days)!.label.toLowerCase();
  }
}

// Last extension only, as the API: "facture.pdf.EXE" gives "exe"
function extensionOf(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot < 0 ? '' : name.slice(lastDot + 1).toLowerCase();
}

// A 401 never shows: the interceptor has already sent the user to the login page
function uploadErrorMessage(status: number): string {
  switch (status) {
    case 413:
      return 'La taille des fichiers est limitée à 1 Go.';
    case 400:
      return 'Le serveur a refusé ce fichier : vérifiez son nom et son type.';
    default:
      return 'Une erreur est survenue, veuillez réessayer.';
  }
}
