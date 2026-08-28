import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserAccountStatus } from '#/generated/prisma/enums.js';
import { MailService } from '#/modules/mail/mail.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { TenantsService } from '#/modules/tenants/services/tenants.service.js';
import { UsersService } from '#/modules/users/services/users.service.js';

import { AuthenticationService } from './authentication.service.js';
import { OtpService } from './otp-service.js';

const USER_ID = 'user-1';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: {
    findOneByUsername: ReturnType<typeof vi.fn>;
    findOneById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateRtHash: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
  };
  let otpService: {
    createAndOverwrite: ReturnType<typeof vi.fn>;
    createAndOverwriteByIdentifier: ReturnType<typeof vi.fn>;
    validateOtp: ReturnType<typeof vi.fn>;
    validateOtpByIdentifier: ReturnType<typeof vi.fn>;
    getConfiguredRetryAfterSeconds: ReturnType<typeof vi.fn>;
  };
  let mailService: {
    sendPhoneOtpMockEmail: ReturnType<typeof vi.fn>;
    sendEmailOtpMockEmail: ReturnType<typeof vi.fn>;
  };
  let appEnv: 'development' | 'production';

  beforeEach(async () => {
    appEnv = 'development';
    userService = {
      findOneByUsername: vi.fn(),
      findOneById: vi.fn(),
      create: vi.fn(),
      updateRtHash: vi.fn().mockResolvedValue('hashed-rt'),
    };
    jwtService = {
      signAsync: vi
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };
    otpService = {
      createAndOverwrite: vi.fn().mockResolvedValue({
        challenge: { id: 'otp-1' },
        code: '123456',
      }),
      createAndOverwriteByIdentifier: vi.fn().mockResolvedValue({
        challenge: { id: 'otp-2' },
        code: '654321',
      }),
      validateOtp: vi.fn().mockResolvedValue(true),
      validateOtpByIdentifier: vi.fn().mockResolvedValue(true),
      getConfiguredRetryAfterSeconds: vi.fn().mockReturnValue(120),
    };
    mailService = {
      sendPhoneOtpMockEmail: vi.fn(),
      sendEmailOtpMockEmail: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: PrismaService, useValue: {} },
        { provide: UsersService, useValue: userService },
        {
          provide: TenantsService,
          useValue: { ensurePersonalTenantForUser: vi.fn() },
        },
        { provide: JwtService, useValue: jwtService },
        { provide: OtpService, useValue: otpService },
        { provide: MailService, useValue: mailService },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(() => ({
              get appEnv() {
                return appEnv;
              },
              jwt: {
                accessSecret: 'access-secret',
                refreshSecret: 'refresh-secret',
                accessExpiresIn: '15m',
                refreshExpiresIn: '7d',
                monitoringAccessSecret: 'monitoring-secret',
                monitoringAccessExpiresIn: '5m',
              },
            })),
          },
        },
      ],
    }).compile();

    service = module.get(AuthenticationService);
  });

  describe('login', () => {
    it('persists refresh token hash so the session is usable', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 4);

      userService.findOneByUsername.mockResolvedValue({
        id: USER_ID,
        username: 'admin',
        password: hashedPassword,
        status: UserAccountStatus.ACTIVE,
      });

      const tokens = await service.login({
        username: 'admin',
        password,
      });

      expect(tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        serverTimeInSeconds: expect.any(Number),
      });
      expect(userService.updateRtHash).toHaveBeenCalledWith({
        userId: USER_ID,
        rt: 'refresh-token',
      });
    });

    it('rejects unknown users without updating refresh hash', async () => {
      userService.findOneByUsername.mockResolvedValue(null);

      await expect(
        service.login({ username: 'missing', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(userService.updateRtHash).not.toHaveBeenCalled();
    });
  });

  describe('sendOtp', () => {
    it('echoes the code while delivery is mocked, keeping the dev flow usable', async () => {
      const response = await service.sendOtp({ phoneNumber: '+989120000000' });

      expect(response).toEqual({
        delivered: true,
        otp: '123456',
        retryAfterSeconds: 120,
      });
    });

    it('withholds the code in production', async () => {
      appEnv = 'production';

      const response = await service.sendOtp({ phoneNumber: '+989120000000' });

      expect(response).toEqual({ delivered: true, retryAfterSeconds: 120 });
      expect(response).not.toHaveProperty('otp');
    });

    it('hands the code to mocked email delivery and never returns it', async () => {
      const response = await service.sendOtp({ email: 'User@Example.com' });

      expect(mailService.sendEmailOtpMockEmail).toHaveBeenCalledWith({
        email: 'user@example.com',
        otp: '654321',
      });
      expect(response).toEqual({ delivered: true, retryAfterSeconds: 120 });
    });
  });
});
