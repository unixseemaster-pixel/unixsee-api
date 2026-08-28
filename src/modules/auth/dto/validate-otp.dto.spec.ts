import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { ValidateOtpDto } from './validate-otp.dto.js';

const validateBody = (body: Record<string, unknown>) =>
  validate(plainToInstance(ValidateOtpDto, body));

const hasExactlyOneTargetError = (
  errors: Awaited<ReturnType<typeof validateBody>>,
) =>
  errors.some((error) =>
    Object.prototype.hasOwnProperty.call(
      error.constraints ?? {},
      'exactlyOneOtpTarget',
    ),
  );

describe('ValidateOtpDto', () => {
  it('rejects a verify body that carries both targets', async () => {
    const errors = await validateBody({
      phoneNumber: '+989120000000',
      email: 'user@example.com',
      otp: '123456',
      context: 'LOGIN',
    });

    expect(hasExactlyOneTargetError(errors)).toBe(true);
  });

  it('rejects a verify body that carries neither target', async () => {
    const errors = await validateBody({
      otp: '123456',
      context: 'LOGIN',
    });

    expect(hasExactlyOneTargetError(errors)).toBe(true);
  });

  it('accepts one phone target and normalizes its digits', async () => {
    const dto = plainToInstance(ValidateOtpDto, {
      phoneNumber: '+۹۸۹۱۲۰۰۰۰۰۰۰',
      otp: '۱۲۳۴۵۶',
      context: 'LOGIN',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.phoneNumber).toBe('+989120000000');
    expect(dto.otp).toBe('123456');
  });

  it('accepts national phone without leading plus', async () => {
    const dto = plainToInstance(ValidateOtpDto, {
      phoneNumber: '09121234567',
      otp: '123456',
      context: 'LOGIN',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.phoneNumber).toBe('+989121234567');
  });

  it('accepts Persian national digits without leading plus', async () => {
    const dto = plainToInstance(ValidateOtpDto, {
      phoneNumber: '۰۹۱۲۱۲۳۴۵۶۷',
      otp: '123456',
      context: 'LOGIN',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.phoneNumber).toBe('+989121234567');
  });

  it('accepts Arabic-Indic national digits and 00 prefix', async () => {
    const dto = plainToInstance(ValidateOtpDto, {
      phoneNumber: '٠٠٩٨٩١٢١٢٣٤٥٦٧',
      otp: '123456',
      context: 'LOGIN',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.phoneNumber).toBe('+989121234567');
  });

  it('accepts international phone digits without leading plus', async () => {
    const dto = plainToInstance(ValidateOtpDto, {
      phoneNumber: '14155552671',
      otp: '123456',
      context: 'LOGIN',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.phoneNumber).toBe('+14155552671');
  });

  it('accepts one normalized email target', async () => {
    const dto = plainToInstance(ValidateOtpDto, {
      email: ' User@Example.COM ',
      otp: '123456',
      context: 'EMAIL_VERIFY',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });
});
