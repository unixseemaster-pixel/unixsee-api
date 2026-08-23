import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createAppLogger } from '#/common/logging/app-logger.js';
import type { AppConfigType } from '#/utils/config/app.config.js';

import { throwStorageException } from '../storage.errors.js';
import type { StorageProvider } from '../storage-provider.interface.js';
import type {
  StorageObjectOptions,
  StorageUploadBody,
  StorageUploadOptions,
} from '../storage.service.js';

@Injectable()
export class SupabaseStorageProvider implements StorageProvider {
  private readonly logger = createAppLogger(SupabaseStorageProvider.name);
  private client: SupabaseClient | undefined;

  constructor(private readonly config: ConfigService<AppConfigType, true>) {}

  async upload(
    path: string,
    body: StorageUploadBody,
    options: StorageUploadOptions = {},
  ): Promise<{ path: string }> {
    const objectPath = this.assertObjectPath(path);
    const bucket = this.resolveBucket(options.bucket);

    try {
      const { data, error } = await this.getClient()
        .storage.from(bucket)
        .upload(objectPath, body as never, {
          cacheControl: options.cacheControl,
          contentType: options.contentType,
          upsert: options.upsert ?? false,
        });

      if (error) {
        this.logger.error('storage.upload.failed', error, {
          bucket,
          path: objectPath,
        });
        throwStorageException(error, 'File upload failed.');
      }

      this.logger.log('storage.upload.completed', {
        bucket,
        path: data.path,
      });

      return { path: data.path };
    } catch (error) {
      this.rethrowIfHttpException(error);
      const err = error as Error;
      this.logger.error('storage.upload.failed', err, {
        bucket,
        path: objectPath,
      });
      throw new ServiceUnavailableException('File upload failed.');
    }
  }

  async download(
    path: string,
    options: StorageObjectOptions = {},
  ): Promise<Blob> {
    const objectPath = this.assertObjectPath(path);
    const bucket = this.resolveBucket(options.bucket);

    try {
      const { data, error } = await this.getClient()
        .storage.from(bucket)
        .download(objectPath);

      if (error) {
        this.logger.error('storage.download.failed', error, {
          bucket,
          path: objectPath,
        });
        throwStorageException(error, 'File download failed.');
      }

      this.logger.log('storage.download.completed', {
        bucket,
        path: objectPath,
      });

      return data;
    } catch (error) {
      this.rethrowIfHttpException(error);
      const err = error as Error;
      this.logger.error('storage.download.failed', err, {
        bucket,
        path: objectPath,
      });
      throw new ServiceUnavailableException('File download failed.');
    }
  }

  async remove(
    paths: string[],
    options: StorageObjectOptions = {},
  ): Promise<void> {
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new BadRequestException('At least one storage path is required.');
    }

    const objectPaths = paths.map((path) => this.assertObjectPath(path));
    const bucket = this.resolveBucket(options.bucket);

    try {
      const { error } = await this.getClient()
        .storage.from(bucket)
        .remove(objectPaths);

      if (error) {
        this.logger.error('storage.remove.failed', error, {
          bucket,
          count: objectPaths.length,
        });
        throwStorageException(error, 'File delete failed.');
      }

      this.logger.log('storage.remove.completed', {
        bucket,
        count: objectPaths.length,
      });
    } catch (error) {
      this.rethrowIfHttpException(error);
      const err = error as Error;
      this.logger.error('storage.remove.failed', err, {
        bucket,
        count: objectPaths.length,
      });
      throw new ServiceUnavailableException('File delete failed.');
    }
  }

  async createSignedUrl(
    path: string,
    expiresInSeconds: number,
    options: StorageObjectOptions = {},
  ): Promise<{ signedUrl: string }> {
    const objectPath = this.assertObjectPath(path);
    const bucket = this.resolveBucket(options.bucket);

    if (
      !Number.isFinite(expiresInSeconds) ||
      !Number.isInteger(expiresInSeconds) ||
      expiresInSeconds <= 0
    ) {
      throw new BadRequestException(
        'Signed URL expiry must be a positive integer number of seconds.',
      );
    }

    try {
      const { data, error } = await this.getClient()
        .storage.from(bucket)
        .createSignedUrl(objectPath, expiresInSeconds);

      if (error) {
        this.logger.error('storage.signed_url.failed', error, {
          bucket,
          path: objectPath,
        });
        throwStorageException(error, 'Signed URL creation failed.');
      }

      this.logger.log('storage.signed_url.completed', {
        bucket,
        path: objectPath,
        expiresInSeconds,
      });

      return { signedUrl: data.signedUrl };
    } catch (error) {
      this.rethrowIfHttpException(error);
      const err = error as Error;
      this.logger.error('storage.signed_url.failed', err, {
        bucket,
        path: objectPath,
      });
      throw new ServiceUnavailableException('Signed URL creation failed.');
    }
  }

  private getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }

    const storage = this.config.get('app', { infer: true }).storage;

    this.client = createClient(storage.url, storage.secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return this.client;
  }

  private resolveBucket(bucket?: string): string {
    const configured = this.config.get('app', { infer: true }).storage.bucket;
    const resolved = (bucket ?? configured).trim();

    if (!resolved) {
      throw new BadRequestException('Storage bucket is required.');
    }

    return resolved;
  }

  private assertObjectPath(path: string): string {
    const trimmed = path?.trim() ?? '';

    if (!trimmed) {
      throw new BadRequestException('Storage object path is required.');
    }

    if (trimmed.startsWith('/') || trimmed.includes('\\')) {
      throw new BadRequestException('Storage object path is invalid.');
    }

    const segments = trimmed.split('/');

    if (
      segments.some(
        (segment) =>
          segment.length === 0 || segment === '.' || segment === '..',
      )
    ) {
      throw new BadRequestException('Storage object path is invalid.');
    }

    return trimmed;
  }

  private rethrowIfHttpException(error: unknown): void {
    if (error instanceof HttpException) {
      throw error;
    }
  }
}
