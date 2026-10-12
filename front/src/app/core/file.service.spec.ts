import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FileResponse } from './api.models';
import { FileService } from './file.service';

describe('FileService', () => {
  let service: FileService;
  let httpMock: HttpTestingController;
  const file = new File(['content'], 'vacances.mp4');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('upload should POST the file and its options as a multipart form', () => {
    const response: FileResponse = {
      id: '3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4',
      originalName: 'vacances.mp4',
      sizeBytes: 7,
      uploadedAt: '2026-10-12T14:00:00Z',
      expiresAt: '2026-10-15T14:00:00Z',
      status: 'ACTIVE',
      passwordProtected: true,
    };
    let received: FileResponse | undefined;

    service
      .upload({ file, password: 'secret1', expirationDays: 3 })
      .subscribe((fileResponse) => (received = fileResponse));

    const call = httpMock.expectOne('/api/files');
    const body = call.request.body as FormData;
    expect(call.request.method).toBe('POST');
    expect((body.get('file') as File).name).toBe('vacances.mp4');
    expect(body.get('password')).toBe('secret1');
    expect(body.get('expirationDays')).toBe('3');
    call.flush(response);
    expect(received).toEqual(response);
  });

  it('upload should send no password field when the password is empty', () => {
    service.upload({ file, password: '', expirationDays: 7 }).subscribe();

    const call = httpMock.expectOne('/api/files');
    expect((call.request.body as FormData).has('password')).toBe(false);
    call.flush(null);
  });
});
