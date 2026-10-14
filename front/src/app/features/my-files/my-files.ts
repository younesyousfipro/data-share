import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileResponse } from '../../core/api.models';
import { FileService } from '../../core/file.service';
import { expiryDay } from '../../shared/expiry';
import { FileSizePipe } from '../../shared/file-size.pipe';

@Component({
  selector: 'app-my-files',
  imports: [DatePipe, FileSizePipe, RouterLink],
  styleUrl: './my-files.css',
  templateUrl: './my-files.html',
})
export class MyFiles {
  protected readonly files = signal<FileResponse[] | null>(null);
  protected readonly loadFailed = signal(false);

  // The statuses are computed by the API at the same moment: the texts must agree with them
  private readonly loadedAt = new Date();

  constructor() {
    inject(FileService).list().subscribe({
      next: (files) => this.files.set(files),
      error: () => this.loadFailed.set(true),
    });
  }

  protected expiryText(file: FileResponse): string {
    return file.status === 'EXPIRED'
      ? 'Expiré'
      : `Expire ${expiryDay(new Date(file.expiresAt), this.loadedAt)}`;
  }
}
