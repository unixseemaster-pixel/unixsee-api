import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

type StorageProviderError = {
  message?: string;
  statusCode?: string | number;
  status?: number;
  error?: string;
  name?: string;
};

function readStatus(error: StorageProviderError): number | undefined {
  if (typeof error.status === 'number') {
    return error.status;
  }

  if (typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  if (typeof error.statusCode === 'string') {
    const parsed = Number(error.statusCode);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

/**
 * Map Supabase Storage errors to Nest HTTP exceptions without leaking
 * provider internals to clients.
 */
export function throwStorageException(
  error: unknown,
  fallbackMessage: string,
): never {
  const providerError = (error ?? {}) as StorageProviderError;
  const status = readStatus(providerError);
  const message = providerError.message?.trim() || fallbackMessage;
  const normalized = message.toLowerCase();

  if (
    status === 400 ||
    status === 409 ||
    normalized.includes('already exists') ||
    normalized.includes('invalid') ||
    normalized.includes('duplicate')
  ) {
    throw new BadRequestException(fallbackMessage);
  }

  if (
    status === 404 ||
    normalized.includes('not found') ||
    normalized.includes('does not exist')
  ) {
    throw new NotFoundException(fallbackMessage);
  }

  throw new ServiceUnavailableException(fallbackMessage);
}
