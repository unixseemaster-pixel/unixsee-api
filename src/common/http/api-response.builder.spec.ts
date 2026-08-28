import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ApiResponseBuilder } from './api-response.builder.js';

describe('ApiResponseBuilder.error', () => {
  it('maps HTTP 409 to the accepted CONFLICT code', () => {
    const response = ApiResponseBuilder.error(HttpStatus.CONFLICT);

    expect(response.statusCode).toBe(HttpStatus.CONFLICT);
    expect(response.error?.code).toBe('CONFLICT');
  });
});
