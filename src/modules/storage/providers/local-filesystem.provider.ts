import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { createAppLogger } from '#/common/logging/app-logger.js';
import type { AppConfigType } from '#/utils/config/app.config.js';

import type {
  StorageObjectOptions,
  StorageUploadBody,
  StorageUploadOptions,
} from '../storage.service.js';
import type { StorageProvider } from '../storage-provider.interface.js';

@Injectable()
export class LocalFilesystemProvider implements StorageProvider {
  private readonly logger = createAppLogger(LocalFilesystemProvider.name);

  constructor(private readonly config: ConfigService<AppConfigType, true>) {}

  async upload(
    filePath: string,
    body: StorageUploadBody,
    _options: StorageUploadOptions = {},
  ): Promise<{ path: string }> {
    const safePath = this.assertObjectPath(filePath);
    const fullPath = this.resolveFullPath(safePath);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, this.bodyToBuffer(body));
      this.logger.log('storage.upload.completed', { path: safePath });
      return { path: safePath };
    } catch (error) {
      this.rethrowIfHttpException(error);
      const err = error as Error;
      this.logger.error('storage.upload.failed', err, { path: safePath });
      throw new ServiceUnavailableException('File upload failed.');
    }
  }

  async download(
    filePath: string,
    _options: StorageObjectOptions = {},
  ): Promise<Blob> {
    const safePath = this.assertObjectPath(filePath);
    const fullPath = this.resolveFullPath(safePath);
    try {
      const buffer = await fs.readFile(fullPath);
      this.logger.log('storage.download.completed', { path: safePath });
      return new Blob([buffer]);
    } catch (error) {
      this.rethrowIfHttpException(error);
      const err = error as Error & { code?: string };
      if (err.code === 'ENOENT') throw new NotFoundException('File not found.');
      this.logger.error('storage.download.failed', err, { path: safePath });
      throw new ServiceUnavailableException('File download failed.');
    }
  }

  async remove(
    paths: string[],
    _options: StorageObjectOptions = {},
  ): Promise<void> {
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new BadRequestException('At least one storage path is required.');
    }
    for (const filePath of paths) {
      const safePath = this.assertObjectPath(filePath);
      const fullPath = this.resolveFullPath(safePath);
      try {
        await fs.unlink(fullPath);
        this.logger.log('storage.remove.completed', { path: safePath });
      } catch (error) {
        this.rethrowIfHttpException(error);
        const err = error as Error & { code?: string };
        if (err.code === 'ENOENT') {
          this.logger.warn('storage.remove.not_found', { path: safePath });
          continue;
        }
        this.logger.error('storage.remove.failed', err, { path: safePath });
        throw new ServiceUnavailableException('File delete failed.');
      }
    }
  }
  async createSignedUrl(
    filePath: string,
    expiresInSeconds: number,
    _options: StorageObjectOptions = {},
  ): Promise<{ signedUrl: string }> {
    const safePath = this.assertObjectPath(filePath);
    if (
      !Number.isFinite(expiresInSeconds) ||
      !Number.isInteger(expiresInSeconds) ||
      expiresInSeconds <= 0
    ) {
      throw new BadRequestException(
        'Signed URL expiry must be a positive integer number of seconds.',
      );
    }
    const fullPath = this.resolveFullPath(safePath);
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException('File not found.');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = safePath + ':' + expiresAt;
    const secret = this.config.get('app', { infer: true }).jwt.accessSecret;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    const baseUrl = this.config.get('app', { infer: true }).storage
      .publicBaseUrl;
    const token = Buffer.from(
      safePath + ':' + expiresAt + ':' + signature,
    ).toString('base64url');
    const signedUrl = baseUrl + '/api/v1/storage/download?token=' + token;
    this.logger.log('storage.signed_url.completed', {
      path: safePath,
      expiresInSeconds,
    });
    return { signedUrl };
  }

  verifySignedToken(token: string): string {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const lastColon = decoded.lastIndexOf(':');
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);
    if (secondLastColon === -1 || lastColon === -1)
      throw new BadRequestException('Invalid download token.');
    const filePath = decoded.substring(0, secondLastColon);
    const expiresAt = parseInt(
      decoded.substring(secondLastColon + 1, lastColon),
      10,
    );
    const sig = decoded.substring(lastColon + 1);
    if (
      !Number.isFinite(expiresAt) ||
      Math.floor(Date.now() / 1000) > expiresAt
    )
      throw new BadRequestException('Download token has expired.');
    const secret = this.config.get('app', { infer: true }).jwt.accessSecret;
    const expectedPayload = filePath + ':' + expiresAt;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(expectedPayload)
      .digest('hex');
    if (
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))
    )
      throw new BadRequestException('Invalid download token.');
    return filePath;
  }

  private resolveFullPath(safePath: string): string {
    const basePath = this.config.get('app', { infer: true }).storage
      .localStoragePath;
    return path.resolve(basePath, safePath);
  }

  private assertObjectPath(filePath: string): string {
    const trimmed = filePath?.trim() ?? '';
    if (!trimmed)
      throw new BadRequestException('Storage object path is required.');
    if (trimmed.startsWith('/') || trimmed.includes('\\'))
      throw new BadRequestException('Storage object path is invalid.');
    const segments = trimmed.split('/');
    if (segments.some((s) => s.length === 0 || s === '.' || s === '..'))
      throw new BadRequestException('Storage object path is invalid.');
    const resolved = path.resolve(this.resolveFullPath(''), trimmed);
    const basePath = this.resolveFullPath('');
    if (!resolved.startsWith(basePath))
      throw new BadRequestException('Storage object path is invalid.');
    return trimmed;
  }

  private bodyToBuffer(body: StorageUploadBody): Buffer {
    if (Buffer.isBuffer(body)) return body;
    if (body instanceof ArrayBuffer) return Buffer.from(body);
    if (body instanceof Blob)
      throw new ServiceUnavailableException(
        'Blob body not supported for local storage.',
      );
    if (typeof body === 'string') return Buffer.from(body, 'utf-8');
    if (body instanceof Uint8Array) return Buffer.from(body);
    throw new ServiceUnavailableException('Unsupported storage body type.');
  }

  private rethrowIfHttpException(error: unknown): void {
    if (error instanceof HttpException) throw error;
  }
}
