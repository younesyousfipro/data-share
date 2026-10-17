import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FileMetadataResponse } from '../../core/api.models';
import { DownloadService } from '../../core/download.service';
import { expiresWithinADay, expiryDay } from '../../shared/expiry';
import { FileSizePipe } from '../../shared/file-size.pipe';
import { saveFile } from '../../shared/save-file';

// The file is gone since the page was opened (deleted, expired): the whole page says so
const UNAVAILABLE_STATUSES = new Set([400, 404, 410]);

interface ExpiryNotice {
  text: string;
  warning: boolean;
}

@Component({
  selector: 'app-download',
  imports: [FileSizePipe, ReactiveFormsModule],
  styleUrl: './download.css',
  templateUrl: './download.html',
})
export class Download {
  private readonly downloadService = inject(DownloadService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  protected readonly metadata = signal<FileMetadataResponse | null>(null);
  protected readonly unavailableMessage = signal<string | null>(null);
  protected readonly serverError = signal<string | null>(null);
  protected readonly downloading = signal(false);
  protected readonly downloadStatus = signal<string | null>(null);

  // Same rule as DownloadRequestDTO; required is checked only for a protected file
  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.required, Validators.maxLength(18)]],
  });

  protected readonly expiry = computed(() => {
    const metadata = this.metadata();
    return metadata ? expiryNotice(new Date(metadata.expiresAt), new Date()) : null;
  });

  constructor() {
    this.downloadService.getMetadata(this.id).subscribe({
      next: (metadata) => this.metadata.set(metadata),
      error: (error: HttpErrorResponse) => this.unavailableMessage.set(unavailableMessage(error.status)),
    });
  }

  protected submit(metadata: FileMetadataResponse): void {
    const password = this.form.controls.password;
    password.markAsTouched();
    if ((metadata.passwordProtected && password.invalid) || this.downloading()) {
      return;
    }

    this.downloading.set(true);
    this.serverError.set(null);
    this.downloadStatus.set('Téléchargement en cours…');
    this.downloadService.download(this.id, password.value).subscribe({
      next: (content) => {
        saveFile(content, metadata.originalName);
        this.downloading.set(false);
        this.downloadStatus.set('Fichier téléchargé.');
      },
      error: (error: HttpErrorResponse) => {
        this.downloading.set(false);
        this.downloadStatus.set(null);
        if (UNAVAILABLE_STATUSES.has(error.status)) {
          this.metadata.set(null);
          this.unavailableMessage.set(unavailableMessage(error.status));
        } else {
          this.serverError.set(
            error.status === 403
              ? 'Mot de passe incorrect.'
              : 'Une erreur est survenue, veuillez réessayer.',
          );
        }
      },
    });
  }

  protected passwordError(): string | null {
    const password = this.form.controls.password;
    if (!password.touched || password.valid) {
      return null;
    }
    return password.hasError('required')
      ? 'Saisissez le mot de passe.'
      : 'Le mot de passe contient 18 caractères au maximum.';
  }
}

function expiryNotice(expiresAt: Date, now: Date): ExpiryNotice {
  return {
    text: `Ce fichier expirera ${expiryDay(expiresAt, now)}.`,
    warning: expiresWithinADay(expiresAt, now),
  };
}

// 400 is an id that is not a UUID: for the recipient, a wrong link like a 404
function unavailableMessage(status: number): string {
  switch (status) {
    case 410:
      return "Ce fichier n'est plus disponible en téléchargement car il a expiré.";
    case 400:
    case 404:
      return "Ce lien de téléchargement n'est pas valide.";
    default:
      return 'Une erreur est survenue, veuillez réessayer.';
  }
}
