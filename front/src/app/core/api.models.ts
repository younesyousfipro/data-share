// Mirrors the schemas of docs/conception/openapi.yaml

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface UploadRequest {
  file: File;
  password: string;
  expirationDays: number;
}

export type FileStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export interface FileResponse {
  id: string;
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
  expiresAt: string;
  status: FileStatus;
  passwordProtected: boolean;
}

export interface FileMetadataResponse {
  originalName: string;
  sizeBytes: number;
  expiresAt: string;
  passwordProtected: boolean;
}

export interface DownloadRequest {
  password?: string;
}
