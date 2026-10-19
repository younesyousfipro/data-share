import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileResponse } from '../../core/api.models';
import { FileService } from '../../core/file.service';
import { FileSizePipe } from '../../shared/file-size.pipe';

// Same rules as the API (multipart limit, FileService, UploadRequestDTO): checked here for comfort only
const MAX_SIZE_BYTES = 1024 ** 3;
const FORBIDDEN_EXTENSIONS = new Set(['exe', 'bat', 'cmd', 'com', 'msi', 'sh', 'ps1', 'vbs', 'jar']);

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
  protected readonly copyMessage = signal<string | null>(null);

  // The link opens the download page of the front (US02), not the API
  protected readonly shareLink = computed(() => {
    const uploadedFile = this.uploadedFile();
    return uploadedFile ? `${window.location.origin}/download/${uploadedFile.id}` : null;
  });

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
    if (FORBIDDEN_EXTENSIONS.has(extensionOf(file.name))) {
      return 'Les fichiers exécutables et les scripts (.exe, .bat, .sh…) ne sont pas acceptés.';
    }
    return null;
  });

  // Cancelling the file picker gives no file: the previous choice is kept.
  // The input is emptied so that choosing the same file again still triggers a change.
  protected selectFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (file) {
      this.file.set(file);
      this.serverError.set(null);
    }
    input.value = '';
  }

  protected restart(): void {
    this.file.set(null);
    this.uploadedFile.set(null);
    this.sending.set(false);
    this.copyMessage.set(null);
    this.form.reset();
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

  protected copyLink(link: string): void {
    navigator.clipboard.writeText(link).then(
      () => this.copyMessage.set('Lien copié.'),
      () => this.copyMessage.set('Copie impossible : sélectionnez le lien pour le copier.'),
    );
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
      return 'Ce fichier a été refusé : vérifiez son nom et son type.';
    default:
      return 'Une erreur est survenue, veuillez réessayer.';
  }
}
