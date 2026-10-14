import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FileMetadataResponse } from './api.models';
import { DownloadService } from './download.service';

describe('DownloadService', () => {
  let service: DownloadService;
  let httpMock: HttpTestingController;
  const id = '3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DownloadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMetadata should GET the public details of the file', () => {
    const response: FileMetadataResponse = {
      originalName: 'vacances.mp4',
      sizeBytes: 7,
      expiresAt: '2026-10-15T14:00:00Z',
      passwordProtected: true,
    };
    let received: FileMetadataResponse | undefined;

    service.getMetadata(id).subscribe((metadata) => (received = metadata));

    const call = httpMock.expectOne(`/api/download/${id}`);
    expect(call.request.method).toBe('GET');
    call.flush(response);
    expect(received).toEqual(response);
  });

  it('download should POST the password and receive the file as a blob', () => {
    const content = new Blob(['content']);
    let received: Blob | undefined;

    service.download(id, 'secret1').subscribe((blob) => (received = blob));

    const call = httpMock.expectOne(`/api/download/${id}`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ password: 'secret1' });
    expect(call.request.responseType).toBe('blob');
    call.flush(content);
    expect(received).toBe(content);
  });

  it('download should send no password field when the password is empty', () => {
    service.download(id, '').subscribe();

    const call = httpMock.expectOne(`/api/download/${id}`);
    expect(call.request.body).toEqual({});
    call.flush(new Blob());
  });
});
