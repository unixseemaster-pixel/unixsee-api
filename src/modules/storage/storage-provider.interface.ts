import type {
  StorageObjectOptions,
  StorageUploadBody,
  StorageUploadOptions,
} from './storage.service.js';

/**
 * Common interface for all storage backends (S3 / local filesystem / etc.).
 * Each provider implements the four core operations; StorageService delegates
 * to whichever provider is active for the current environment.
 */
export interface StorageProvider {
  upload(
    path: string,
    body: StorageUploadBody,
    options?: StorageUploadOptions,
  ): Promise<{ path: string }>;
  download(path: string, options?: StorageObjectOptions): Promise<Blob>;
  remove(paths: string[], options?: StorageObjectOptions): Promise<void>;
  createSignedUrl(
    path: string,
    expiresInSeconds: number,
    options?: StorageObjectOptions,
  ): Promise<{ signedUrl: string }>;
}
