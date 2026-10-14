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

  // No account id to send: the API reads it in the JWT added by the interceptor
  list(): Observable<FileResponse[]> {
    return this.http.get<FileResponse[]>('/api/files');
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/files/${id}`);
  }
}
