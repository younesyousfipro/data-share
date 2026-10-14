import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileMetadataResponse } from '../../core/api.models';
import { DownloadService } from '../../core/download.service';
import { FileSizePipe } from '../../shared/file-size.pipe';

const DAY_MS = 24 * 60 * 60 * 1000;

interface ExpiryNotice {
  text: string;
  warning: boolean;
}

@Component({
  selector: 'app-download',
  imports: [FileSizePipe],
  styleUrl: './download.css',
  templateUrl: './download.html',
})
export class Download {
  private readonly downloadService = inject(DownloadService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  protected readonly metadata = signal<FileMetadataResponse | null>(null);
  protected readonly unavailableMessage = signal<string | null>(null);

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
}

// Warning under 24 h, as the EXPIRING_SOON status of the API. The text counts calendar
// days: a file expiring at 9 am tomorrow expires "demain", even 30 h ahead.
function expiryNotice(expiresAt: Date, now: Date): ExpiryNotice {
  const days = calendarDaysBetween(now, expiresAt);
  const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
  return {
    text: `Ce fichier expirera ${when}.`,
    warning: expiresAt.getTime() - now.getTime() < DAY_MS,
  };
}

// Math.round absorbs the hour gained or lost when summer time starts or ends
function calendarDaysBetween(from: Date, to: Date): number {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
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
