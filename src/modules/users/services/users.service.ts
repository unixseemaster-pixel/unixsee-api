import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import type { Prisma } from '#/generated/prisma/client.js';
import {
  Role,
  UserAccountStatus,
} from '#/generated/prisma/enums.js';
import bcrypt from 'bcryptjs';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { OtpService } from '#/modules/auth/services/otp-service.js';
import { MailService } from '#/modules/mail/mail.service.js';
import { RequestContext } from '#/common/logging/request-context.js';
import { StorageService } from '#/modules/storage/storage.service.js';

const userPublicOmit = {
  hashedRt: true,
  password: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = createAppLogger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}


  /** Never expose hashedRt/password; surface session presence only. */
  private toAdminUserView<T extends { hashedRt: string | null }>(user: T) {
    const { hashedRt, ...safe } = user;
    return {
      ...safe,
      hasActiveSession: Boolean(hashedRt),
    };
  }

  async findOneByPhoneNumber(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
      omit: userPublicOmit,
    });
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      omit: userPublicOmit,
    });
  }

  async findCustomerByPhoneOrEmail(input: {
    phoneNumber?: string | null;
    email?: string | null;
  }) {
    const phoneNumber = input.phoneNumber?.trim();
    const email = input.email?.trim().toLowerCase();
    const orConditions: Prisma.UserWhereInput[] = [];

    if (phoneNumber) {
      orConditions.push({ phoneNumber });
    }

    if (email) {
      orConditions.push({ email });
    }

    if (orConditions.length === 0) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        role: { in: [Role.USER, Role.TENANT] },
        OR: orConditions,
      },
      omit: userPublicOmit,
    });
  }

  async findCustomerOwningWebsiteDomain(domain: string) {
    const website = await this.prisma.website.findFirst({
      where: {
        OR: [
          { domain },
          { domain: `www.${domain}` },
        ],
        user: {
          role: { in: [Role.USER, Role.TENANT] },
        },
      },
      select: {
        id: true,
        domain: true,
        userId: true,
      },
    });

    return website;
  }

  async findOneById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      omit: {
        password: true,
      },
    });
  }

  async findOneByUsername({ username }: { username: string }) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(input: {
    username?: string | null;
    email?: string | null;
    fullName?: string | null;
    phoneNumber?: string | null;
    password?: string | null;
    role?: Role;
    locale?: string;
    phoneVerifiedAt?: Date | null;
    emailVerifiedAt?: Date | null;
  }) {
    const phoneNumber = input.phoneNumber?.trim() || null;
    const email = input.email?.trim().toLowerCase() || null;

    if (!phoneNumber && !email) {
      throw new BadRequestException('Phone number or email is required.');
    }

    const user = await this.prisma.user.create({
      data: {
        phoneNumber,
        email,
        ...(input.password && { password: input.password }),
        ...(input.fullName && { fullName: input.fullName }),
        ...(input.username && { username: input.username }),
        ...(input.role && { role: input.role }),
        ...(input.locale && { locale: input.locale }),
        ...(input.phoneVerifiedAt !== undefined && {
          phoneVerifiedAt: input.phoneVerifiedAt,
        }),
        ...(input.emailVerifiedAt !== undefined && {
          emailVerifiedAt: input.emailVerifiedAt,
        }),
      },
      omit: userPublicOmit,
    });

    this.logger.log('user.created', {
      userId: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    return user;
  }

  async updateRtHash({ userId, rt }: { userId: string; rt: string }) {
    const rtHash = await bcrypt.hash(rt, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRt: rtHash },
    });

    this.logger.debug('user.refresh_token_hash.updated', { userId });

    return rtHash;
  }

  async updateMe(
    userId: string,
    data: { fullName?: string; email?: string; locale?: string },
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const nextEmail =
      data.email !== undefined ? data.email.trim().toLowerCase() : undefined;
    const emailChanged =
      nextEmail !== undefined && nextEmail !== (current.email ?? '');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(nextEmail !== undefined && {
          email: nextEmail,
          ...(emailChanged ? { emailVerifiedAt: null } : {}),
        }),
      },
      omit: userPublicOmit,
    });
  }

  async requestPhoneVerifyOtp(userId: string, phoneNumber: string) {
    RequestContext.setUserId(userId);
    this.logger.log('user.phone_verify.otp_requested', { userId, phoneNumber });

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: userPublicOmit,
    });
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (phoneNumber !== current.phoneNumber) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          phoneNumber,
          NOT: { id: userId },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'ACCOUNT_EXISTS',
          message: ERROR_MESSAGES.fa.conflict,
        });
      }
    }

    const otp = await this.otpService.createAndOverwrite({
      length: 6,
      phoneNumber,
      context: 'PHONE_VERIFY',
    });

    await this.mailService.sendPhoneOtpMockEmail({
      phoneNumber,
      otp: otp.otp,
    });

    this.logger.log('user.phone_verify.otp_created', {
      userId,
      otpId: otp.id,
    });
    return { delivered: true as const };
  }

  async verifyPhoneOtp(
    userId: string,
    input: { phoneNumber: string; otp: string },
  ) {
    RequestContext.setUserId(userId);
    this.logger.log('user.phone_verify.attempt', {
      userId,
      phoneNumber: input.phoneNumber,
    });

    await this.otpService.validateOtp({
      phoneNumber: input.phoneNumber,
      otp: input.otp,
      context: 'PHONE_VERIFY',
    });

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: userPublicOmit,
    });
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (input.phoneNumber !== current.phoneNumber) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          phoneNumber: input.phoneNumber,
          NOT: { id: userId },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'ACCOUNT_EXISTS',
          message: ERROR_MESSAGES.fa.conflict,
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber: input.phoneNumber,
        phoneVerifiedAt: new Date(),
      },
      omit: userPublicOmit,
    });

    await this.otpService.remove(input.otp);

    this.logger.log('user.phone_verify.completed', { userId });
    return updated;
  }

  async requestEmailVerifyOtp(userId: string, email: string) {
    RequestContext.setUserId(userId);
    const normalized = email.trim().toLowerCase();
    this.logger.log('user.email_verify.otp_requested', {
      userId,
      email: normalized,
    });

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: userPublicOmit,
    });
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (normalized !== (current.email ?? '')) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          email: normalized,
          NOT: { id: userId },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'ACCOUNT_EXISTS',
          message: ERROR_MESSAGES.fa.conflict,
        });
      }
    }

    const otp = await this.otpService.createAndOverwriteByIdentifier({
      length: 6,
      identifier: normalized,
      context: 'EMAIL_VERIFY',
    });

    await this.mailService.sendEmailOtpMockEmail({
      email: normalized,
      otp: otp.otp,
    });

    this.logger.log('user.email_verify.otp_created', {
      userId,
      otpId: otp.id,
    });
    return { delivered: true as const };
  }

  async verifyEmailOtp(
    userId: string,
    input: { email: string; otp: string },
  ) {
    RequestContext.setUserId(userId);
    const normalized = input.email.trim().toLowerCase();
    this.logger.log('user.email_verify.attempt', {
      userId,
      email: normalized,
    });

    await this.otpService.validateOtpByIdentifier({
      identifier: normalized,
      otp: input.otp,
      context: 'EMAIL_VERIFY',
    });

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: userPublicOmit,
    });
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (normalized !== (current.email ?? '')) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          email: normalized,
          NOT: { id: userId },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'ACCOUNT_EXISTS',
          message: ERROR_MESSAGES.fa.conflict,
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: normalized,
        emailVerifiedAt: new Date(),
      },
      omit: userPublicOmit,
    });

    await this.otpService.remove(input.otp);

    this.logger.log('user.email_verify.completed', { userId });
    return updated;
  }

  async listAdmin(params?: { skip?: number; take?: number; search?: string }) {
    const searchWhere: Prisma.UserWhereInput | undefined = params?.search
      ? {
          OR: [
            { phoneNumber: { contains: params.search } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { username: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const where: Prisma.UserWhereInput = {
      role: { in: [Role.USER, Role.TENANT] },
      ...searchWhere,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        omit: { password: true },
        include: {
          memberships: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              websites: true,
              memberships: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toAdminUserView(row)),
      total,
    };
  }

  async getAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: { password: true },
      include: {
        memberships: { include: { tenant: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    return this.toAdminUserView(user);
  }

  async createAdmin(input: {
    phoneNumber: string;
    email?: string;
    fullName?: string;
    username?: string;
    role?: Role;
    locale?: string;
  }) {
    return this.create({
      ...input,
      role: input.role ?? Role.USER,
    });
  }

  async updateAdmin(
    userId: string,
    data: {
      fullName?: string;
      email?: string | null;
      username?: string | null;
      role?: Role;
      locale?: string;
    },
  ) {
    await this.getAdmin(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      omit: { password: true },
      include: {
        memberships: { include: { tenant: true } },
      },
    });
    return this.toAdminUserView(updated);
  }

  async suspend(userId: string, reason: string) {
    await this.getAdmin(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserAccountStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: reason,
        hashedRt: null,
      },
      omit: { password: true },
      include: {
        memberships: { include: { tenant: true } },
      },
    });

    this.logger.log('user.suspended', { userId, reason });
    return this.toAdminUserView(user);
  }

  async restore(userId: string, reason?: string) {
    await this.getAdmin(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserAccountStatus.ACTIVE,
        suspendedAt: null,
        suspendedReason: null,
      },
      omit: { password: true },
      include: {
        memberships: { include: { tenant: true } },
      },
    });

    this.logger.log('user.restored', { userId, reason: reason ?? null });
    return this.toAdminUserView(user);
  }

  async revokeSessions(userId: string, reason: string) {
    await this.getAdmin(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRt: null },
      omit: { password: true },
      include: {
        memberships: { include: { tenant: true } },
      },
    });

    this.logger.log('user.sessions.revoked', { userId, reason });
    return this.toAdminUserView(user);
  }

  /**
   * Starts a controlled re-auth challenge on a verified contact channel.
   * Never returns OTP / recovery secrets to staff.
   */
  async startRecovery(userId: string, reason: string) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: { password: true },
      include: {
        memberships: { include: { tenant: true } },
      },
    });
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const phone =
      current.phoneVerifiedAt && current.phoneNumber
        ? current.phoneNumber
        : null;
    const email =
      current.emailVerifiedAt && current.email ? current.email : null;

    if (!phone && !email) {
      throw new BadRequestException({
        code: 'RECOVERY_CHANNEL_UNAVAILABLE',
        message: 'No verified contact channel is available for recovery.',
      });
    }

    let channel: 'phone' | 'email';
    if (phone) {
      channel = 'phone';
      const otp = await this.otpService.createAndOverwrite({
        length: 6,
        phoneNumber: phone,
        context: 'LOGIN',
      });
      await this.mailService.sendPhoneOtpMockEmail({
        phoneNumber: phone,
        otp: otp.otp,
      });
    } else {
      channel = 'email';
      const otp = await this.otpService.createAndOverwriteByIdentifier({
        length: 6,
        identifier: email!,
        context: 'LOGIN',
      });
      await this.mailService.sendEmailOtpMockEmail({
        email: email!,
        otp: otp.otp,
      });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRt: null },
      omit: { password: true },
      include: {
        memberships: { include: { tenant: true } },
      },
    });

    this.logger.log('user.recovery.started', {
      userId,
      reason,
      channel,
    });

    return {
      channel,
      delivered: true as const,
      user: this.toAdminUserView(user),
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only image files are allowed' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.en.notFound);
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const storageKey = 'avatars/' + userId + '/' + crypto.randomUUID() + '.' + ext;

    await this.storageService.upload(storageKey, file.buffer, { contentType: file.mimetype });

    const { signedUrl } = await this.storageService.createSignedUrl(storageKey, 30 * 24 * 60 * 60);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: signedUrl },
      omit: { hashedRt: true, password: true },
    });

    this.logger.log('user.avatar_uploaded', { userId });
    return updated;
  }

}
