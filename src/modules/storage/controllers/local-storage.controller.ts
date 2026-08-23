import { Controller, Get, Query, Res, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'node:path';

import { createAppLogger } from '#/common/logging/app-logger.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import { ConfigService } from '@nestjs/config';
import { Public } from '#/modules/auth/decorators/public.decorator.js';

import { StorageService } from '../storage.service.js';

/**
 * Serves local filesystem files via signed download tokens.
 * Only active when STORAGE_PROVIDER="filesystem".
 */
@Controller('v1/storage')
export class LocalStorageController {
  private readonly logger = createAppLogger(LocalStorageController.name);

  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppConfigType, true>,
  ) {}

  // Public: the signed token in the query string IS the authorization.
  // Tokens are only minted after owner/admin checks in the ticket and
  // unixsee-message services, and they expire (default 1h).
  @Public()
  @Get('download')
  async download(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      res.status(400).json({ message: 'Token is required.' });
      return;
    }

    try {
      const filePath = this.storage.verifySignedToken(token);

      // Resolve the full path on disk
      const basePath = this.config.get('app', { infer: true }).storage
        .localStoragePath;
      const fullPath = path.resolve(basePath, filePath);

      // Security headers: prevent token leakage via Referer and caching
      res.set({
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, private',
      });

      // Serve the file
      res.sendFile(fullPath, (err) => {
        if (err && !res.headersSent) {
          this.logger.error('storage.download.serve_failed', err as Error, {
            path: filePath,
          });
          res.status(404).json({ message: 'File not found.' });
        }
      });
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json({ message: error.message });
      } else {
        this.logger.error('storage.download.failed', error as Error);
        res.status(500).json({ message: 'Download failed.' });
      }
    }
  }
}
