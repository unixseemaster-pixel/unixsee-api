import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import {
  AuthorizationCaseStatus,
  ContactChallengeState,
} from '#/generated/prisma/enums.js';
import type { Prisma } from '#/generated/prisma/client.js';
import { ComplementaryServicesService } from '#/modules/complementary-services/services/complementary-services.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { StorageService } from '#/modules/storage/storage.service.js';
import { TenantsService } from '#/modules/tenants/services/tenants.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

const TERMINAL_OR_LOCKED: AuthorizationCaseStatus[] = [
  AuthorizationCaseStatus.PENDING_REVIEW,
  AuthorizationCaseStatus.APPROVED,
];

const EDITABLE: AuthorizationCaseStatus[] = [
  AuthorizationCaseStatus.DRAFT,
  AuthorizationCaseStatus.NEEDS_MORE_INFO,
  AuthorizationCaseStatus.REJECTED,
];

export type AuthorizationPackageInput = {
  nationalId: string;
  birthDate: string;
  mobile: string;
  mobileChallenge: ContactChallengeState;
  mobileBelongsToNationalId: boolean;
  email: string;
  emailChallenge: ContactChallengeState;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  nationalIdCardFileName?: string | null;
  attestedTruthful: boolean;
};

const adminInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      phoneVerifiedAt: true,
      emailVerifiedAt: true,
    },
  },
  tenant: { select: { id: true, name: true, displayName: true } },
  decidedBy: { select: { id: true, fullName: true, username: true } },
} satisfies Prisma.AuthorizationCaseInclude;

@Injectable()
export class AuthorizationCasesService {
  private readonly logger = createAppLogger(AuthorizationCasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
    private readonly storageService: StorageService,
    private readonly complementaryServices: ComplementaryServicesService,
  ) {}

  async getMine(userId: string) {
    return this.prisma.authorizationCase.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async saveDraft(userId: string, input: AuthorizationPackageInput) {
    const existing = await this.getMine(userId);
    if (existing && TERMINAL_OR_LOCKED.includes(existing.status)) {
      throw new ConflictException({
        code: 'AUTHORIZATION_LOCKED',
        message: ERROR_MESSAGES.en.conflict,
      });
    }

    const data = this.toPackageData(input);

    if (!existing) {
      const created = await this.prisma.authorizationCase.create({
        data: {
          userId,
          status: AuthorizationCaseStatus.DRAFT,
          ...data,
        },
      });
      this.logger.log('authorization_case.draft_created', {
        caseId: created.id,
        userId,
      });
      return created;
    }

    const updated = await this.prisma.authorizationCase.update({
      where: { id: existing.id },
      data: {
        ...data,
        status:
          existing.status === AuthorizationCaseStatus.NEEDS_MORE_INFO ||
          existing.status === AuthorizationCaseStatus.REJECTED
            ? existing.status
            : AuthorizationCaseStatus.DRAFT,
      },
    });
    this.logger.log('authorization_case.draft_saved', {
      caseId: updated.id,
      userId,
    });
    return updated;
  }

  async submit(userId: string, input: AuthorizationPackageInput) {
    this.assertComplete(input);

    const existing = await this.getMine(userId);
    if (existing && TERMINAL_OR_LOCKED.includes(existing.status)) {
      throw new ConflictException({
        code: 'AUTHORIZATION_LOCKED',
        message: ERROR_MESSAGES.en.conflict,
      });
    }

    if (
      existing &&
      !EDITABLE.includes(existing.status) &&
      existing.status !== AuthorizationCaseStatus.DRAFT
    ) {
      throw new ConflictException({
        code: 'AUTHORIZATION_LOCKED',
        message: ERROR_MESSAGES.en.conflict,
      });
    }

    const data = this.toPackageData(input);
    const now = new Date();

    if (!existing) {
      const created = await this.prisma.authorizationCase.create({
        data: {
          userId,
          status: AuthorizationCaseStatus.PENDING_REVIEW,
          submittedAt: now,
          staffReason: null,
          staffFieldsToFix: [],
          ...data,
        },
      });
      this.logger.log('authorization_case.submitted', {
        caseId: created.id,
        userId,
      });
      return created;
    }

    const updated = await this.prisma.authorizationCase.update({
      where: { id: existing.id },
      data: {
        ...data,
        status: AuthorizationCaseStatus.PENDING_REVIEW,
        submittedAt: now,
        staffReason: null,
        staffFieldsToFix: [],
        decidedAt: null,
        decidedByUserId: null,
        tenantId: null,
      },
    });
    this.logger.log('authorization_case.submitted', {
      caseId: updated.id,
      userId,
    });
    return updated;
  }

  async listAdmin(params?: {
    status?: AuthorizationCaseStatus;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.AuthorizationCaseWhereInput = {
      status: params?.status
        ? params.status
        : { not: AuthorizationCaseStatus.DRAFT },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.authorizationCase.findMany({
        where,
        include: adminInclude,
        orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.authorizationCase.count({ where }),
    ]);

    return { items, total };
  }

  async getAdmin(id: string) {
    const authCase = await this.prisma.authorizationCase.findUnique({
      where: { id },
      include: adminInclude,
    });
    if (!authCase) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return authCase;
  }

  async approve(id: string, staffUserId: string) {
    const authCase = await this.getAdmin(id);
    if (authCase.status !== AuthorizationCaseStatus.PENDING_REVIEW) {
      throw new BadRequestException({
        code: 'AUTHORIZATION_NOT_PENDING',
        message: ERROR_MESSAGES.en.validation,
      });
    }

    const displayName =
      authCase.user.fullName?.trim() ||
      authCase.user.phoneNumber ||
      authCase.user.email ||
      authCase.userId;
    const tenantName = `مستأجر ${displayName}`;

    const tenant = await this.tenantsService.ensurePersonalTenantForUser(
      authCase.userId,
      tenantName,
    );

    await this.prisma.user.update({
      where: { id: authCase.userId },
      data: { authorized: true },
    });

    const updated = await this.prisma.authorizationCase.update({
      where: { id },
      data: {
        status: AuthorizationCaseStatus.APPROVED,
        tenantId: tenant.id,
        decidedAt: new Date(),
        decidedByUserId: staffUserId,
        staffReason: null,
        staffFieldsToFix: [],
      },
      include: adminInclude,
    });

    await this.complementaryServices.reconcileDeferredForUser(
      authCase.userId,
      tenant.id,
    );
    this.logger.log('authorization_case.approved', {
      caseId: id,
      userId: authCase.userId,
      tenantId: tenant.id,
      staffUserId,
      authorized: true,
    });
    return updated;
  }

  async needsMoreInfo(
    id: string,
    staffUserId: string,
    input: { reason: string; fieldsToFix: string[] },
  ) {
    const authCase = await this.getAdmin(id);
    if (authCase.status !== AuthorizationCaseStatus.PENDING_REVIEW) {
      throw new BadRequestException({
        code: 'AUTHORIZATION_NOT_PENDING',
        message: ERROR_MESSAGES.en.validation,
      });
    }

    const updated = await this.prisma.authorizationCase.update({
      where: { id },
      data: {
        status: AuthorizationCaseStatus.NEEDS_MORE_INFO,
        staffReason: input.reason.trim(),
        staffFieldsToFix: input.fieldsToFix,
        decidedAt: new Date(),
        decidedByUserId: staffUserId,
      },
      include: adminInclude,
    });

    this.logger.log('authorization_case.needs_more_info', {
      caseId: id,
      staffUserId,
    });
    return updated;
  }

  async reject(id: string, staffUserId: string, input: { reason: string }) {
    const authCase = await this.getAdmin(id);
    if (authCase.status !== AuthorizationCaseStatus.PENDING_REVIEW) {
      throw new BadRequestException({
        code: 'AUTHORIZATION_NOT_PENDING',
        message: ERROR_MESSAGES.en.validation,
      });
    }

    const updated = await this.prisma.authorizationCase.update({
      where: { id },
      data: {
        status: AuthorizationCaseStatus.REJECTED,
        staffReason: input.reason.trim(),
        staffFieldsToFix: [],
        decidedAt: new Date(),
        decidedByUserId: staffUserId,
      },
      include: adminInclude,
    });

    this.logger.log('authorization_case.rejected', {
      caseId: id,
      staffUserId,
    });
    return updated;
  }

  private toPackageData(input: AuthorizationPackageInput) {
    return {
      nationalId: input.nationalId.trim(),
      birthDate: input.birthDate.trim(),
      mobile: input.mobile.trim(),
      mobileChallenge: input.mobileChallenge,
      mobileBelongsToNationalId: input.mobileBelongsToNationalId,
      email: input.email.trim(),
      emailChallenge: input.emailChallenge,
      province: input.province.trim(),
      city: input.city.trim(),
      address: input.address.trim(),
      postalCode: input.postalCode.trim(),
      nationalIdCardFileName: input.nationalIdCardFileName?.trim() || null,
      attestedTruthful: input.attestedTruthful,
    };
  }

  private assertComplete(input: AuthorizationPackageInput) {
    const mobileOk =
      input.mobileChallenge === ContactChallengeState.VERIFIED ||
      input.mobileChallenge === ContactChallengeState.SKIPPED_ALREADY_VERIFIED;
    const emailOk =
      input.emailChallenge === ContactChallengeState.VERIFIED ||
      input.emailChallenge === ContactChallengeState.SKIPPED_ALREADY_VERIFIED;
    const mobileBelongsOk =
      input.mobileChallenge !==
        ContactChallengeState.SKIPPED_ALREADY_VERIFIED ||
      input.mobileBelongsToNationalId;

    if (
      !input.nationalId.trim() ||
      !input.birthDate.trim() ||
      !input.mobile.trim() ||
      !mobileOk ||
      !mobileBelongsOk ||
      !input.email.trim() ||
      !emailOk ||
      !input.province.trim() ||
      !input.city.trim() ||
      !input.address.trim() ||
      !input.postalCode.trim() ||
      !input.nationalIdCardFileName?.trim() ||
      !input.attestedTruthful
    ) {
      throw new BadRequestException({
        code: 'AUTHORIZATION_INCOMPLETE',
        message: ERROR_MESSAGES.en.validation,
      });
    }
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    if (
      !file.mimetype.startsWith('image/') &&
      file.mimetype !== 'application/pdf'
    ) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: 'Only image files and PDF are allowed',
      });
    }

    const existing = await this.getMine(userId);
    if (existing && TERMINAL_OR_LOCKED.includes(existing.status)) {
      throw new ConflictException({
        code: 'AUTHORIZATION_LOCKED',
        message: ERROR_MESSAGES.en.conflict,
      });
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const storageKey =
      'authorization/' + userId + '/' + crypto.randomUUID() + '.' + ext;

    await this.storageService.upload(storageKey, file.buffer, {
      contentType: file.mimetype,
    });

    const { signedUrl } = await this.storageService.createSignedUrl(
      storageKey,
      30 * 24 * 60 * 60,
    );

    // Update or create the authorization case with the document
    if (existing) {
      await this.prisma.authorizationCase.update({
        where: { id: existing.id },
        data: {
          nationalIdCardFileName: file.originalname,
          nationalIdCardStorageKey: storageKey,
        },
      });
    } else {
      await this.prisma.authorizationCase.create({
        data: {
          userId,
          status: AuthorizationCaseStatus.DRAFT,
          nationalId: '',
          birthDate: '',
          mobile: '',
          email: '',
          nationalIdCardFileName: file.originalname,
          nationalIdCardStorageKey: storageKey,
        },
      });
    }

    this.logger.log('authorization_case.document_uploaded', { userId });
    return { fileName: file.originalname, storageKey, downloadUrl: signedUrl };
  }
}
