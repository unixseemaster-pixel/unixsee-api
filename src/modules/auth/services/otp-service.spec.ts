import {
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Otp } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

import { OtpService } from './otp-service.js';

const PHONE = '+989120000000';
const EMAIL = 'user@example.com';

const OTP_CONFIG = {
  expiredTimeMinutes: 5,
  retryTimeMinutes: 2,
  maxVerifyAttempts: 5,
  maxRequestsPerWindow: 5,
  requestWindowMinutes: 60,
  ipRequestLimit: 10,
  ipRequestWindowSeconds: 600,
  ipVerifyLimit: 20,
  ipVerifyWindowSeconds: 600,
  targetVerifyLimit: 10,
  targetVerifyWindowSeconds: 600,
};

/**
 * Minimal in-memory stand-in for `prisma.otp`, covering only the operations the
 * service uses. Rows are cloned on read so the service cannot mutate stored
 * state by accident, which is what makes the attempt-count assertions meaningful.
 */
class FakeOtpTable {
  rows: Otp[] = [];

  private matches(row: Otp, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, value]) => {
      if (value === undefined) return true;

      const actual = row[key as keyof Otp];

      if (value instanceof Date) {
        return actual instanceof Date && actual.getTime() === value.getTime();
      }

      if (value && typeof value === 'object') {
        const filter = value as { gt?: unknown; lt?: unknown };

        if (filter.gt !== undefined) {
          return actual instanceof Date && actual > (filter.gt as Date);
        }

        if (filter.lt !== undefined) {
          return typeof actual === 'number' && actual < Number(filter.lt);
        }
      }

      return actual === value;
    });
  }

  findUnique = vi.fn(({ where }: { where: Record<string, unknown> }) => {
    const row = this.rows.find((candidate) => this.matches(candidate, where));
    return Promise.resolve(row ? { ...row } : null);
  });

  findFirst = vi.fn(({ where }: { where: Record<string, unknown> }) => {
    const row = this.rows.find((candidate) => this.matches(candidate, where));
    return Promise.resolve(row ? { ...row } : null);
  });

  create = vi.fn(({ data }: { data: Record<string, unknown> }) => {
    const conflicts = this.rows.some(
      (candidate) =>
        (typeof data.phoneNumber === 'string' &&
          candidate.phoneNumber === data.phoneNumber) ||
        (typeof data.identifier === 'string' &&
          candidate.identifier === data.identifier),
    );

    if (conflicts) {
      return Promise.reject(
        Object.assign(new Error('unique constraint violation'), {
          code: 'P2002',
        }),
      );
    }

    const row = {
      id: `otp-${this.rows.length + 1}`,
      otpHash: '',
      phoneNumber: null,
      identifier: null,
      expiredTime: new Date(),
      lastRequestedTime: null,
      context: 'LOGIN',
      attemptCount: 0,
      consumedAt: null,
      requestCount: 0,
      requestWindowStartedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Otp;

    this.rows.push(row);
    return Promise.resolve({ ...row });
  });

  update = vi.fn(
    ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const row = this.rows.find((candidate) => this.matches(candidate, where));

      if (!row) return Promise.reject(new Error('record not found'));

      for (const [key, value] of Object.entries(data)) {
        if (
          value &&
          typeof value === 'object' &&
          'increment' in (value as Record<string, unknown>)
        ) {
          const increment = (value as { increment: number }).increment;
          const current = row[key as keyof Otp] as unknown as number;
          Object.assign(row, { [key]: current + increment });
          continue;
        }

        Object.assign(row, { [key]: value });
      }

      return Promise.resolve({ ...row });
    },
  );

  updateMany = vi.fn(
    ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const targets = this.rows.filter((candidate) =>
        this.matches(candidate, where),
      );

      for (const row of targets) {
        for (const [key, value] of Object.entries(data)) {
          if (
            value &&
            typeof value === 'object' &&
            'increment' in (value as Record<string, unknown>)
          ) {
            const increment = (value as { increment: number }).increment;
            const current = row[key as keyof Otp] as unknown as number;
            Object.assign(row, { [key]: current + increment });
            continue;
          }

          Object.assign(row, { [key]: value });
        }
      }

      return Promise.resolve({ count: targets.length });
    },
  );
}

describe('OtpService', () => {
  let service: OtpService;
  let table: FakeOtpTable;

  beforeEach(async () => {
    table = new FakeOtpTable();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: { otp: table } },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue({ otp: OTP_CONFIG }) },
        },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  /** Rewinds the cooldown/window clock so a reissue is allowed in tests. */
  const allowImmediateReissue = () => {
    for (const row of table.rows) {
      row.lastRequestedTime = new Date(Date.now() - 10 * 60_000);
    }
  };

  describe('generation', () => {
    it('issues a code of the requested length made only of digits', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      expect(issued.code).toMatch(/^\d{6}$/);
    });

    it('does not use Math.random', async () => {
      const mathRandom = vi.spyOn(Math, 'random');

      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      expect(mathRandom).not.toHaveBeenCalled();
    });

    it('produces varied codes across issues', async () => {
      const codes = new Set<string>();

      for (let i = 0; i < 20; i++) {
        table.rows = [];
        const issued = await service.createAndOverwrite({
          length: 6,
          phoneNumber: PHONE,
        });
        codes.add(issued.code);
      }

      // A fixed or trivially sequential generator would collapse these.
      expect(codes.size).toBeGreaterThan(15);
    });

    it('always returns exactly the requested number of digits', async () => {
      // Digits are drawn independently, so a leading zero must survive as a
      // character rather than being lost to numeric coercion.
      const codes: string[] = [];

      for (let i = 0; i < 60; i++) {
        table.rows = [];
        const issued = await service.createAndOverwrite({
          length: 6,
          phoneNumber: PHONE,
        });
        codes.push(issued.code);
      }

      expect(codes.every((code) => /^\d{6}$/.test(code))).toBe(true);
    });
  });

  describe('storage', () => {
    it('never persists the plaintext code', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      const [row] = table.rows;
      const serialized = JSON.stringify(row);

      expect(serialized).not.toContain(issued.code);
      expect(row.otpHash).not.toBe(issued.code);
      expect(row).not.toHaveProperty('otp');
    });

    it('stores a bcrypt digest that verifies against the issued code', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      const [row] = table.rows;

      expect(row.otpHash).toMatch(/^\$2[aby]\$\d{2}\$/);
      await expect(bcrypt.compare(issued.code, row.otpHash)).resolves.toBe(
        true,
      );
    });

    it('resets attempts and consumption when a code is reissued', async () => {
      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      table.rows[0].attemptCount = 3;
      table.rows[0].consumedAt = new Date();
      allowImmediateReissue();

      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      expect(table.rows[0].attemptCount).toBe(0);
      expect(table.rows[0].consumedAt).toBeNull();
    });
  });

  describe('verification', () => {
    it('accepts the correct code', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: issued.code }),
      ).resolves.toBe(true);
    });

    it('rejects a wrong code and charges an attempt', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });
      const wrong = issued.code === '000000' ? '111111' : '000000';

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: wrong }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(table.rows[0].attemptCount).toBe(1);
      expect(table.rows[0].consumedAt).toBeNull();
    });

    it('admits at most five concurrent comparisons against one challenge', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });
      const guesses: string[] = [];

      for (let value = 0; guesses.length < 6; value++) {
        const guess = String(value).padStart(6, '0');
        if (guess !== issued.code) guesses.push(guess);
      }

      const outcomes = await Promise.allSettled(
        guesses.map((otp) => service.validateOtp({ phoneNumber: PHONE, otp })),
      );

      expect(outcomes.every((outcome) => outcome.status === 'rejected')).toBe(
        true,
      );
      expect(table.rows[0].attemptCount).toBe(OTP_CONFIG.maxVerifyAttempts);
      expect(table.rows[0].consumedAt).toBeNull();
    });

    it('rejects an expired code', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      table.rows[0].expiredTime = new Date(Date.now() - 1_000);

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: issued.code }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown target', async () => {
      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('uses one conditional attempt write for unknown targets and mismatches', async () => {
      table.updateMany.mockClear();

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(table.updateMany).toHaveBeenCalledTimes(1);

      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });
      const wrong = issued.code === '000000' ? '111111' : '000000';
      table.updateMany.mockClear();

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: wrong }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(table.updateMany).toHaveBeenCalledTimes(1);
    });

    it('pays the decoy comparison when bcrypt metadata is malformed', async () => {
      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });
      table.rows[0].otpHash = `$2z$10$${'a'.repeat(22)}`;

      const compareWithDecoy = vi.spyOn(
        service as unknown as {
          compareWithDecoy(submitted: string): Promise<void>;
        },
        'compareWithDecoy',
      );

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(compareWithDecoy).toHaveBeenCalledTimes(1);
    });

    it('consumes the code on success so it cannot be reused', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      await service.validateOtp({ phoneNumber: PHONE, otp: issued.code });

      expect(table.rows[0].consumedAt).toBeInstanceOf(Date);

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: issued.code }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('allows only one concurrent replay of the correct code to succeed', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      const outcomes = await Promise.allSettled([
        service.validateOtp({ phoneNumber: PHONE, otp: issued.code }),
        service.validateOtp({ phoneNumber: PHONE, otp: issued.code }),
      ]);

      expect(
        outcomes.filter((outcome) => outcome.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        outcomes.filter((outcome) => outcome.status === 'rejected'),
      ).toHaveLength(1);
      expect(table.rows[0].consumedAt).toBeInstanceOf(Date);
    });

    it('clears cooldown and request-window state after successful verification', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });

      await service.validateOtp({ phoneNumber: PHONE, otp: issued.code });

      expect(table.rows[0]).toMatchObject({
        attemptCount: 0,
        lastRequestedTime: null,
        requestCount: 0,
        requestWindowStartedAt: null,
      });

      await expect(
        service.createAndOverwrite({ length: 6, phoneNumber: PHONE }),
      ).resolves.toMatchObject({ code: expect.any(String) });

      expect(table.rows[0]).toMatchObject({
        attemptCount: 0,
        consumedAt: null,
        requestCount: 1,
      });
    });

    it('locks verification once the attempt limit is reached, even for the correct code', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });
      const wrong = issued.code === '000000' ? '111111' : '000000';

      for (let i = 0; i < OTP_CONFIG.maxVerifyAttempts; i++) {
        await expect(
          service.validateOtp({ phoneNumber: PHONE, otp: wrong }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      expect(table.rows[0].attemptCount).toBe(OTP_CONFIG.maxVerifyAttempts);

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: issued.code }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // The locked challenge is never consumed, and the budget is not charged
      // further once it is exhausted.
      expect(table.rows[0].consumedAt).toBeNull();
      expect(table.rows[0].attemptCount).toBe(OTP_CONFIG.maxVerifyAttempts);
    });

    it('does not verify a code issued for a different context', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
        context: 'PHONE_VERIFY',
      });

      await expect(
        service.validateOtp({
          phoneNumber: PHONE,
          otp: issued.code,
          context: 'LOGIN',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('reports the same error and message for every rejection reason', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });
      const wrong = issued.code === '000000' ? '111111' : '000000';

      const capture = async (promise: Promise<unknown>) => {
        const outcome = await promise.then(
          () => undefined,
          (error: unknown) => error,
        );

        if (!(outcome instanceof UnauthorizedException)) {
          throw new Error('expected an UnauthorizedException');
        }

        return outcome.getResponse();
      };

      const unknownTarget = await capture(
        service.validateOtp({ phoneNumber: '+989129999999', otp: '123456' }),
      );
      const mismatch = await capture(
        service.validateOtp({ phoneNumber: PHONE, otp: wrong }),
      );

      table.rows[0].expiredTime = new Date(Date.now() - 1_000);
      const expired = await capture(
        service.validateOtp({ phoneNumber: PHONE, otp: issued.code }),
      );

      expect(mismatch).toEqual(unknownTarget);
      expect(expired).toEqual(unknownTarget);
      expect(unknownTarget).toEqual({
        code: 'OTP_VERIFICATION_FAILED',
        message: 'Verification failed.',
      });
    });

    it('verifies and consumes identifier-based codes', async () => {
      const issued = await service.createAndOverwriteByIdentifier({
        length: 6,
        identifier: EMAIL,
      });

      await expect(
        service.validateOtpByIdentifier({
          identifier: EMAIL,
          otp: issued.code,
        }),
      ).resolves.toBe(true);

      await expect(
        service.validateOtpByIdentifier({
          identifier: EMAIL,
          otp: issued.code,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('issue limits', () => {
    /** Asserts a rejection is a 429, without depending on internal field names. */
    const expectRateLimited = async (promise: Promise<unknown>) => {
      const outcome = await promise.then(
        () => undefined,
        (error: unknown) => error,
      );

      expect(outcome).toBeInstanceOf(HttpException);
      expect((outcome as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    };

    it('maps a concurrent first-issue uniqueness race to 429 without an error log', async () => {
      const error = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      const outcomes = await Promise.allSettled([
        service.createAndOverwrite({ length: 6, phoneNumber: PHONE }),
        service.createAndOverwrite({ length: 6, phoneNumber: PHONE }),
      ]);
      const fulfilled = outcomes.filter(
        (outcome) => outcome.status === 'fulfilled',
      );
      const rejected = outcomes.filter(
        (outcome): outcome is PromiseRejectedResult =>
          outcome.status === 'rejected',
      );

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(HttpException);
      expect((rejected[0].reason as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(error).not.toHaveBeenCalled();
    });

    it('rejects a reissue inside the cooldown', async () => {
      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      await expectRateLimited(
        service.createAndOverwrite({ length: 6, phoneNumber: PHONE }),
      );
    });

    it('includes remaining cooldown seconds on a rejected reissue', async () => {
      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      const outcome = await service
        .createAndOverwrite({ length: 6, phoneNumber: PHONE })
        .then(
          () => undefined,
          (error: unknown) => error,
        );

      expect(outcome).toBeInstanceOf(HttpException);
      expect((outcome as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((outcome as HttpException).getResponse()).toEqual({
        code: 'RATE_LIMITED',
        message: expect.stringContaining('Please wait'),
        details: {
          retryAfterSeconds: expect.any(Number),
        },
      });
      expect(
        (
          (outcome as HttpException).getResponse() as {
            details: { retryAfterSeconds: number };
          }
        ).details.retryAfterSeconds,
      ).toBeGreaterThan(0);
    });

    it('rejects issuing more codes than the per-target window allows', async () => {
      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      for (let i = 1; i < OTP_CONFIG.maxRequestsPerWindow; i++) {
        allowImmediateReissue();
        await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });
      }

      expect(table.rows[0].requestCount).toBe(OTP_CONFIG.maxRequestsPerWindow);

      allowImmediateReissue();
      await expectRateLimited(
        service.createAndOverwrite({ length: 6, phoneNumber: PHONE }),
      );
    });

    it('starts a fresh window once the previous one has elapsed', async () => {
      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      table.rows[0].requestCount = OTP_CONFIG.maxRequestsPerWindow;
      table.rows[0].requestWindowStartedAt = new Date(
        Date.now() - (OTP_CONFIG.requestWindowMinutes + 1) * 60_000,
      );
      allowImmediateReissue();

      await expect(
        service.createAndOverwrite({ length: 6, phoneNumber: PHONE }),
      ).resolves.toMatchObject({ code: expect.any(String) });

      expect(table.rows[0].requestCount).toBe(1);
    });
  });

  describe('logging', () => {
    /** Captures everything the service writes through the Nest logger. */
    const captureLogs = () => {
      const lines: string[] = [];
      const record = (message: unknown) => {
        lines.push(String(message));
      };

      for (const level of ['log', 'warn', 'debug', 'error'] as const) {
        vi.spyOn(Logger.prototype, level).mockImplementation(record);
      }

      return lines;
    };

    it('never writes the code or its digest to the log', async () => {
      const lines = captureLogs();

      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });
      await service.validateOtp({ phoneNumber: PHONE, otp: issued.code });

      const output = lines.join('\n');

      expect(lines.length).toBeGreaterThan(0);
      expect(output).not.toContain(issued.code);
      expect(output).not.toContain(table.rows[0].otpHash);
    });

    it('never writes a rejected submission or an unmasked target to the log', async () => {
      const issued = await service.createAndOverwrite({
        length: 6,
        phoneNumber: PHONE,
      });
      const wrong = issued.code === '000000' ? '111111' : '000000';
      const lines = captureLogs();

      await expect(
        service.validateOtp({ phoneNumber: PHONE, otp: wrong }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      const output = lines.join('\n');

      expect(output).not.toContain(wrong);
      expect(output).not.toContain(PHONE);
    });

    it('never writes an unmasked email target to the log', async () => {
      const lines = captureLogs();

      const issued = await service.createAndOverwriteByIdentifier({
        length: 6,
        identifier: EMAIL,
      });
      await service.validateOtpByIdentifier({
        identifier: EMAIL,
        otp: issued.code,
      });

      const output = lines.join('\n');

      expect(output).not.toContain(EMAIL);
      expect(output).not.toContain(issued.code);
    });

    it('does not report a rate-limited request as a server error', async () => {
      const error = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      await service.createAndOverwrite({ length: 6, phoneNumber: PHONE });

      // Still inside the cooldown, so this reissue is rejected with a 429.
      await expect(
        service.createAndOverwrite({ length: 6, phoneNumber: PHONE }),
      ).rejects.toBeInstanceOf(HttpException);

      // Being rate limited is expected caller traffic: it is warned about once,
      // and never logged as an error with a stack trace. Otherwise anyone
      // hammering the endpoint floods the error log — the very cost that rate
      // limiting is there to remove.
      expect(warn).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });
});
