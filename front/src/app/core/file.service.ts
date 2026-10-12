import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FileResponse, UploadRequest } from './api.models';

@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly http = inject(HttpClient);

  upload({ file, password, expirationDays }: UploadRequest): Observable<FileResponse> {
    const body = new FormData();
    body.append('file', file);
    body.append('expirationDays', String(expirationDays));
    // An empty password would be rejected by the API (6 characters minimum): no password means no field
    if (password) {
      body.append('password', password);
    }
    return this.http.post<FileResponse>('/api/files', body);
  }
}
