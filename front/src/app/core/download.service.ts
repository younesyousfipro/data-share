import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DownloadRequest, FileMetadataResponse } from './api.models';

// Public side of a file, reached through its share link: no JWT (see auth.interceptor)
@Injectable({ providedIn: 'root' })
export class DownloadService {
  private readonly http = inject(HttpClient);

  getMetadata(id: string): Observable<FileMetadataResponse> {
    return this.http.get<FileMetadataResponse>(`/api/download/${id}`);
  }

  download(id: string, password: string): Observable<Blob> {
    const body: DownloadRequest = password ? { password } : {};
    return this.http.post(`/api/download/${id}`, body, { responseType: 'blob' });
  }
}
