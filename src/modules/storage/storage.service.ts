import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfigType } from '#/utils/config/app.config.js';
import type { StorageProvider } from './storage-provider.interface.js';
import { LocalFilesystemProvider } from './providers/local-filesystem.provider.js';
import { SupabaseStorageProvider } from './providers/supabase-storage.provider.js';

export type StorageUploadBody =
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | Buffer
  | File
  | FormData
  | NodeJS.ReadableStream
  | ReadableStream
  | URLSearchParams
  | string;

export type StorageUploadOptions = {
  bucket?: string;
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
};

export type StorageObjectOptions = {
  bucket?: string;
};

/**
 * Facade that delegates to the active storage provider.
 * When STORAGE_PROVIDER="filesystem" (default) the local filesystem is used;
 * when "s3" the Supabase S3 client is used.
 *
 * All consumers inject StorageService — they never see the provider directly.
 */
@Injectable()
export class StorageService implements StorageProvider {
  private readonly provider: StorageProvider;

  constructor(private readonly config: ConfigService<AppConfigType, true>) {
    const providerType = (process.env.STORAGE_PROVIDER ?? 'filesystem')
      .trim()
      .toLowerCase();

    if (providerType === 's3') {
      this.provider = new SupabaseStorageProvider(config);
    } else {
      this.provider = new LocalFilesystemProvider(config);
    }
  }

  async upload(
    path: string,
    body: StorageUploadBody,
    options?: StorageUploadOptions,
  ): Promise<{ path: string }> {
    return this.provider.upload(path, body, options);
  }

  async download(path: string, options?: StorageObjectOptions): Promise<Blob> {
    return this.provider.download(path, options);
  }

  async remove(paths: string[], options?: StorageObjectOptions): Promise<void> {
    return this.provider.remove(paths, options);
  }

  async createSignedUrl(
    path: string,
    expiresInSeconds: number,
    options?: StorageObjectOptions,
  ): Promise<{ signedUrl: string }> {
    return this.provider.createSignedUrl(path, expiresInSeconds, options);
  }

  /**
   * Verify a signed download token. Only meaningful for the local filesystem
   * provider — returns the file path if valid.
   */
  verifySignedToken(token: string): string {
    if (this.provider instanceof LocalFilesystemProvider) {
      return this.provider.verifySignedToken(token);
    }
    throw new Error(
      'verifySignedToken is only available with the local filesystem provider.',
    );
  }
}
