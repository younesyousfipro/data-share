import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileResponse } from '../../core/api.models';
import { FileService } from '../../core/file.service';
import { expiryDay } from '../../shared/expiry';
import { FileSizePipe } from '../../shared/file-size.pipe';

type Filter = 'ALL' | 'ACTIVE' | 'EXPIRED';

@Component({
  selector: 'app-my-files',
  imports: [DatePipe, FileSizePipe, RouterLink],
  styleUrl: './my-files.css',
  templateUrl: './my-files.html',
})
export class MyFiles {
  protected readonly files = signal<FileResponse[] | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly deleteFailed = signal(false);
  protected readonly deletedName = signal<string | null>(null);

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'EXPIRED', label: 'Expiré' },
  ];
  // Not "Tous" as in the mockup: US06 shows only non-expired files by default, see decisions.md
  protected readonly filter = signal<Filter>('ACTIVE');

  // Filtered here, sorted by the API: the order of the list is kept
  protected readonly visibleFiles = computed(() =>
    (this.files() ?? []).filter((file) => matches(file, this.filter())),
  );

  // The statuses are computed by the API at the same moment: the texts must agree with them
  private readonly loadedAt = new Date();

  private readonly fileService = inject(FileService);

  constructor() {
    this.fileService.list().subscribe({
      next: (files) => this.files.set(files),
      error: () => this.loadFailed.set(true),
    });
  }

  protected expiryText(file: FileResponse): string {
    return file.status === 'EXPIRED'
      ? 'Expiré'
      : `Expire ${expiryDay(new Date(file.expiresAt), this.loadedAt)}`;
  }

  protected deleteFile(file: FileResponse): void {
    if (!window.confirm(`Supprimer définitivement « ${file.originalName} » ?`)) {
      return;
    }
    this.deleteFailed.set(false);
    this.deletedName.set(null);
    this.fileService.delete(file.id).subscribe({
      // The row goes away without reloading the list: the API already removed it
      next: () => {
        this.files.update((files) => files!.filter((other) => other.id !== file.id));
        this.deletedName.set(file.originalName);
      },
      error: () => this.deleteFailed.set(true),
    });
  }
}

function matches(file: FileResponse, filter: Filter): boolean {
  switch (filter) {
    case 'ALL':
      return true;
    case 'ACTIVE':
      return file.status !== 'EXPIRED';
    case 'EXPIRED':
      return file.status === 'EXPIRED';
  }
}
