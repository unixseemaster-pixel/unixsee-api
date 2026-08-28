import { Otp, OtpContext } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomInt, timingSafeEqual } from 'node:crypto';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { isClientFailure } from '#/common/http/client-failure.js';

interface CreateOtpParams {
  length: number;
  phoneNumber: string;
  context?: OtpContext;
}

interface CreateOtpByIdentifierParams {
  length: number;
  identifier: string;
  context?: OtpContext;
}

interface ValidateOtpParams {
  otp: string;
  phoneNumber: string;
  context?: OtpContext;
}

interface ValidateOtpByIdentifierParams {
  identifier: string;
  otp: string;
  context?: OtpContext;
}

/**
 * An issued challenge plus the plaintext code, which exists only in memory for
 * the duration of the request that delivers it. Callers hand `code` to the
 * delivery channel and must never persist or log it.
 */
export interface IssuedOtp {
  challenge: Otp;
  code: string;
}

/**
 * bcrypt cost for OTP digests. Deliberately lower than the cost 12 used for
 * passwords: a 6-digit code has only 10^6 possibilities, so a leaked digest is
 * crackable offline at any cost factor. The digest is there to stop a database
 * reader from replaying a *live* code, and the real guessing defence is the
 * attempt limit plus the short expiry. Cost 10 keeps verification latency
 * reasonable given every verification performs one hash.
 */
const OTP_HASH_ROUNDS = 10;

/** Length of a bcrypt salt prefix (`$2b$NN$` + 22 chars). */
const BCRYPT_SALT_LENGTH = 29;

/**
 * Pre-generated digest for timing equalization. Keeping it static avoids an
 * extra hash on the first rejected request, so every decoy path pays one bcrypt
 * comparison rather than one hash plus one comparison.
 */
const OTP_DECOY_HASH =
  '$2b$10$ZJt3j54Z/1VxQ3y9vCErze/vm4iCdIZhDmexmVFzXRerh.oAu5xi.';

/**
 * Prisma error code for a unique-index collision. Raised when two concurrent
 * first-time requests for the same target both try to insert the row.
 */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Prisma error code for "record required but not found". Raised when the row a
 * lookup saw is gone by the time the follow-up write runs.
 */
const RECORD_NOT_FOUND = 'P2025';

/**
 * `Otp.id` is a v4 UUID, which can never be the nil UUID, so this names no row.
 * Rejection paths that have no challenge to reserve an attempt against issue
 * their conditional update against this id instead, so "no such target" costs
 * the same database round-trip as "wrong code" — see `verifyAndConsume`.
 */
const NO_SUCH_CHALLENGE_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class OtpService {
  private readonly logger = createAppLogger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfigType, true>,
  ) {}

  /**
   * Full per-target reissue cooldown in seconds (`OTP_RETRY_TIME` minutes).
   * Returned on successful OTP request so UIs can seed resend timers without
   * inventing a client-side default.
   */
  getConfiguredRetryAfterSeconds(): number {
    return this.config.get('app', { infer: true }).otp.retryTimeMinutes * 60;
  }

  /**
   * Issues a code for a phone number, replacing any outstanding challenge.
   *
   * Returns the challenge and the plaintext code; only the digest is stored.
   */
  async createAndOverwrite({
    length,
    phoneNumber,
    context = 'LOGIN',
  }: CreateOtpParams): Promise<IssuedOtp> {
    this.logger.debug('otp.create_or_overwrite.started', {
      context,
      phoneNumber,
      length,
    });

    try {
      const existOtp = await this.prisma.otp.findUnique({
        where: { phoneNumber },
      });

      this.logger.debug('otp.existing_lookup.completed', {
        context,
        phoneNumber,
        found: Boolean(existOtp),
      });

      const issued = await this.issue({
        existing: existOtp,
        length,
        context,
        where: { phoneNumber },
        createData: { phoneNumber },
      });

      this.logger.log(existOtp ? 'otp.updated' : 'otp.created', {
        context,
        otpId: issued.challenge.id,
      });

      return issued;
    } catch (error) {
      if (!isClientFailure(error)) {
        this.logger.error('otp.create_or_overwrite.failed', error as Error, {
          context,
          phoneNumber,
        });
      }
      throw error;
    }
  }

  /**
   * Issues a code for an email/identifier target, replacing any outstanding
   * challenge.
   */
  async createAndOverwriteByIdentifier({
    length,
    identifier,
    context = 'EMAIL_VERIFY',
  }: CreateOtpByIdentifierParams): Promise<IssuedOtp> {
    // Logged as `email` rather than `identifier`: every caller passes an email
    // address, and the logger masks `*email*` keys but not `identifier`.
    this.logger.debug('otp.identifier.create_or_overwrite.started', {
      context,
      email: identifier,
      length,
    });

    try {
      const existOtp = await this.prisma.otp.findUnique({
        where: { identifier },
      });

      const issued = await this.issue({
        existing: existOtp,
        length,
        context,
        where: { identifier },
        createData: { identifier },
      });

      this.logger.log(
        existOtp ? 'otp.identifier.updated' : 'otp.identifier.created',
        {
          context,
          otpId: issued.challenge.id,
        },
      );

      return issued;
    } catch (error) {
      if (!isClientFailure(error)) {
        this.logger.error(
          'otp.identifier.create_or_overwrite.failed',
          error as Error,
          {
            context,
            email: identifier,
          },
        );
      }
      throw error;
    }
  }

  /**
   * Verifies a submitted code for a phone number and consumes the challenge on
   * success, so the same code cannot be used twice.
   *
   * Every rejection path throws the same error: a caller cannot distinguish an
   * unknown target from a wrong code, an expired code, an already-used code, or
   * an exhausted attempt budget.
   */
  async validateOtp({
    otp,
    phoneNumber,
    context = 'LOGIN',
  }: ValidateOtpParams): Promise<true> {
    const existOtp = await this.prisma.otp.findFirst({
      where: { phoneNumber, context },
    });

    await this.verifyAndConsume({
      challenge: existOtp,
      submitted: otp,
      logEvent: 'otp.validation',
      logFields: { context, phoneNumber },
    });

    this.logger.debug('otp.validation.accepted', { context, phoneNumber });
    return true;
  }

  /**
   * Verifies a submitted code for an email/identifier target and consumes the
   * challenge on success.
   */
  async validateOtpByIdentifier({
    identifier,
    otp,
    context = 'EMAIL_VERIFY',
  }: ValidateOtpByIdentifierParams): Promise<true> {
    const existOtp = await this.prisma.otp.findFirst({
      where: { identifier, context },
    });

    await this.verifyAndConsume({
      challenge: existOtp,
      submitted: otp,
      logEvent: 'otp.identifier_validation',
      // See `createAndOverwriteByIdentifier`: `email` is a masked log key.
      logFields: { context, email: identifier },
    });

    this.logger.debug('otp.identifier_validation.accepted', {
      email: identifier,
      context,
    });
    return true;
  }

  /**
   * Creates or replaces a challenge, enforcing both the per-target cooldown and
   * the rolling per-target request ceiling.
   */
  private async issue({
    existing,
    length,
    context,
    where,
    createData,
  }: {
    existing: Otp | null;
    length: number;
    context: OtpContext;
    where: { phoneNumber: string } | { identifier: string };
    createData: { phoneNumber: string } | { identifier: string };
  }): Promise<IssuedOtp> {
    const otpConfig = this.config.get('app', { infer: true }).otp;
    const code = this.createCode(length);
    const otpHash = await bcrypt.hash(code, OTP_HASH_ROUNDS);
    const now = new Date();
    const expiredTime = this.createExpiredDateByMinute(
      otpConfig.expiredTimeMinutes,
    );

    if (!existing) {
      // `phoneNumber` and `identifier` are unique, so two concurrent first-time
      // requests for the same target both arrive here with `existing === null`
      // and one of them loses on the index. That loser is caller traffic, not a
      // server fault: a code was just issued for this target, which is exactly
      // what the cooldown below reports, so answer with the same 429 rather than
      // letting P2002 escape as a 500 plus a stack trace in the error log.
      //
      // Deliberately not an `upsert`: an upsert would hand the loser a *second*
      // freshly issued code, resetting the rolling window to 1 and skipping the
      // cooldown entirely, so N parallel requests would mean N delivered codes.
      // Failing the loser closed is the point.
      try {
        const challenge = await this.prisma.otp.create({
          data: {
            ...createData,
            context,
            otpHash,
            expiredTime,
            lastRequestedTime: now,
            requestCount: 1,
            requestWindowStartedAt: now,
          },
        });

        return { challenge, code };
      } catch (error) {
        if (!this.isPrismaError(error, UNIQUE_CONSTRAINT_VIOLATION))
          throw error;

        this.logger.warn('otp.create.raced', { context });

        throw this.rateLimited('Too many requests. Please try again later.');
      }
    }

    this.assertRetryAllowed(existing, otpConfig.retryTimeMinutes);

    const window = this.resolveRequestWindow({
      existing,
      now,
      windowMinutes: otpConfig.requestWindowMinutes,
    });

    if (window.count > otpConfig.maxRequestsPerWindow) {
      this.logger.warn('otp.request_limit.rejected', {
        context,
        otpId: existing.id,
        limit: otpConfig.maxRequestsPerWindow,
      });

      throw this.rateLimited('Too many requests. Please try again later.');
    }

    // Same race in mirror image: the row can disappear between the lookup and
    // this write, and Prisma reports that as P2025. Rate limiting fails closed —
    // asking the caller to retry costs them one round-trip, whereas rebuilding
    // the row here would apply limits computed against a row that is gone.
    try {
      const challenge = await this.prisma.otp.update({
        where,
        data: {
          context,
          otpHash,
          expiredTime,
          lastRequestedTime: now,
          // A reissue is a fresh challenge: the previous code is gone, so its
          // failed attempts and consumed state must not carry over.
          attemptCount: 0,
          consumedAt: null,
          requestCount: window.count,
          requestWindowStartedAt: window.startedAt,
        },
      });

      return { challenge, code };
    } catch (error) {
      if (!this.isPrismaError(error, RECORD_NOT_FOUND)) throw error;

      this.logger.warn('otp.update.raced', { context, otpId: existing.id });

      throw this.rateLimited('Too many requests. Please try again later.');
    }
  }

  /**
   * Shared verification core: atomically reserves an attempt before comparing
   * the digest, then consumes the challenge on success.
   */
  private async verifyAndConsume({
    challenge,
    submitted,
    logEvent,
    logFields,
  }: {
    challenge: Otp | null;
    submitted: string;
    logEvent: string;
    logFields: Record<string, unknown>;
  }): Promise<void> {
    const maxAttempts = this.config.get('app', { infer: true }).otp
      .maxVerifyAttempts;
    const terminalReason = challenge
      ? this.findTerminalReason(challenge, maxAttempts)
      : undefined;
    const reservableChallenge =
      challenge && !terminalReason ? challenge : undefined;

    const reservation = await this.prisma.otp.updateMany({
      where: {
        id: reservableChallenge?.id ?? NO_SUCH_CHALLENGE_ID,
        // Bind the reservation to the exact challenge snapshot. A concurrent
        // reissue reuses the row id but changes the digest; an old verification
        // must never spend an attempt on, or consume, the new code.
        ...(reservableChallenge
          ? { otpHash: reservableChallenge.otpHash }
          : {}),
        consumedAt: null,
        expiredTime: { gt: new Date() },
        attemptCount: { lt: maxAttempts },
      },
      data: { attemptCount: { increment: 1 } },
    });

    if (!challenge || reservation.count !== 1) {
      await this.compareWithDecoy(submitted);

      this.logger.warn(`${logEvent}.rejected`, {
        ...logFields,
        reason: challenge
          ? (terminalReason ?? 'attempt_reservation_lost')
          : 'not_found',
        otpId: challenge?.id,
        maxAttempts,
      });

      throw this.verificationFailed();
    }

    const matches = await this.codeMatchesHash(submitted, challenge.otpHash);

    if (!matches) {
      this.logger.warn(`${logEvent}.rejected`, {
        ...logFields,
        reason: 'mismatch',
        otpId: challenge.id,
        maxAttempts,
      });

      throw this.verificationFailed();
    }

    // Consume as a conditional update so two concurrent requests carrying the
    // same correct code cannot both succeed.
    const consumed = await this.prisma.otp.updateMany({
      where: {
        id: challenge.id,
        otpHash: challenge.otpHash,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
        // A successful proof ends both the challenge and its issuance-throttle
        // state. The row remains as the single per-target slot, but the user can
        // request a genuinely fresh challenge immediately.
        attemptCount: 0,
        lastRequestedTime: null,
        requestCount: 0,
        requestWindowStartedAt: null,
      },
    });

    if (consumed.count !== 1) {
      this.logger.warn(`${logEvent}.rejected`, {
        ...logFields,
        reason: 'already_consumed',
        otpId: challenge.id,
      });

      throw this.verificationFailed();
    }
  }

  /**
   * Reasons a challenge is dead before any code comparison is worth doing. The
   * caller never sees which one applied.
   */
  private findTerminalReason(
    challenge: Otp,
    maxAttempts: number,
  ): 'already_consumed' | 'expired' | 'attempts_exhausted' | undefined {
    if (challenge.consumedAt) return 'already_consumed';
    if (this.isOtpExpired(challenge.expiredTime)) return 'expired';
    if (challenge.attemptCount >= maxAttempts) return 'attempts_exhausted';

    return undefined;
  }

  /**
   * One error shape for every verification failure, so the response carries no
   * signal about which check failed.
   */
  private verificationFailed(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'OTP_VERIFICATION_FAILED',
      message: 'Verification failed.',
    });
  }

  private rateLimited(
    message: string,
    details?: { retryAfterSeconds: number },
  ): HttpException {
    return new HttpException(
      { code: 'RATE_LIMITED', message, details },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Compares a submitted code with a stored digest.
   *
   * bcrypt's own `compare` is not documented as constant-time, so the submitted
   * code is hashed with the stored salt and the two digests are compared with
   * `timingSafeEqual`.
   */
  private async codeMatchesHash(
    submitted: string,
    storedHash: string,
  ): Promise<boolean> {
    if (storedHash.length < BCRYPT_SALT_LENGTH) {
      // A malformed digest can never match; still pay the hash so the
      // rejection costs the same as a normal mismatch.
      await this.compareWithDecoy(submitted);
      return false;
    }

    const salt = storedHash.slice(0, BCRYPT_SALT_LENGTH);

    let submittedHash: string;
    try {
      submittedHash = await bcrypt.hash(submitted, salt);
    } catch {
      // Invalid bcrypt metadata can make hashing fail before paying the normal
      // comparison cost. Equalise that path with every other rejection.
      await this.compareWithDecoy(submitted);
      return false;
    }

    const submittedBuffer = Buffer.from(submittedHash);
    const storedBuffer = Buffer.from(storedHash);

    if (submittedBuffer.length !== storedBuffer.length) return false;

    return timingSafeEqual(submittedBuffer, storedBuffer);
  }

  /** Performs one throwaway bcrypt comparison to equalise rejection timing. */
  private async compareWithDecoy(submitted: string): Promise<void> {
    await bcrypt.compare(submitted, OTP_DECOY_HASH);
  }

  /** Matches the stable Prisma error code without depending on one JS realm. */
  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === code
    );
  }

  /**
   * Generates a numeric code using `crypto.randomInt`, which draws from the
   * platform CSPRNG and discards modulo-biased samples. `Math.random` is a
   * predictable PRNG and must never generate credentials.
   */
  private createCode(length: number): string {
    let otpCode = '';

    for (let i = 0; i < length; i++) {
      otpCode += randomInt(0, 10);
    }

    return otpCode;
  }

  /** Rejects reissues inside the per-target cooldown, reporting the wait left. */
  private assertRetryAllowed(existing: Otp, retryTimeMinutes: number): void {
    const retryAllowed = existing.lastRequestedTime
      ? this.isRetryAllowed(existing.lastRequestedTime, retryTimeMinutes)
      : true;

    if (retryAllowed === true) return;

    const minText =
      retryAllowed.minutes > 0 ? `${retryAllowed.minutes} minutes and` : '';
    const secText =
      retryAllowed.seconds > 0 ? `${retryAllowed.seconds} seconds` : '';
    const wait = `${minText} ${secText}`.trim();

    this.logger.warn('otp.retry.rejected', {
      otpId: existing.id,
      wait,
      retryAfterSeconds: retryAllowed.retryAfterSeconds,
    });

    throw this.rateLimited(`Please wait ${wait}`, {
      retryAfterSeconds: retryAllowed.retryAfterSeconds,
    });
  }

  /**
   * Advances the rolling issue window: a fresh window once the previous one has
   * elapsed, otherwise one more request inside the current window.
   */
  private resolveRequestWindow({
    existing,
    now,
    windowMinutes,
  }: {
    existing: Otp;
    now: Date;
    windowMinutes: number;
  }): { count: number; startedAt: Date } {
    const startedAt = existing.requestWindowStartedAt;

    if (!startedAt) {
      return { count: 1, startedAt: now };
    }

    const windowEndsAt = new Date(startedAt.getTime() + windowMinutes * 60_000);

    if (now >= windowEndsAt) {
      return { count: 1, startedAt: now };
    }

    return { count: existing.requestCount + 1, startedAt };
  }

  private createExpiredDateByMinute(minute: number): Date {
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + minute);

    return currentDate;
  }

  private isOtpExpired(otpDate: Date) {
    const currentDate = new Date();
    return currentDate > otpDate;
  }

  private isRetryAllowed(
    lastRequestedTime: Date,
    retryTime: number,
  ): true | { minutes: number; seconds: number; retryAfterSeconds: number } {
    const now = new Date();
    const retryDate = new Date(lastRequestedTime);
    retryDate.setMinutes(retryDate.getMinutes() + retryTime);

    if (now > retryDate) {
      return true;
    }

    const diffMs = retryDate.getTime() - now.getTime();
    const retryAfterSeconds = Math.max(1, Math.ceil(diffMs / 1000));
    const minutes = Math.floor(retryAfterSeconds / 60);
    const seconds = retryAfterSeconds % 60;

    return { minutes, seconds, retryAfterSeconds };
  }
}
