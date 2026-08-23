import {
  AuthorizationCaseStatus,
  ContactChallengeState,
} from '#/generated/prisma/enums.js';

type CaseRow = {
  id: string;
  userId: string;
  status: AuthorizationCaseStatus;
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
  nationalIdCardFileName: string | null;
  attestedTruthful: boolean;
  staffReason: string | null;
  staffFieldsToFix: string[];
  submittedAt: Date | null;
  decidedAt: Date | null;
  decidedByUserId: string | null;
  tenantId: string | null;
  updatedAt: Date;
  createdAt: Date;
};

type AdminCaseRow = CaseRow & {
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
    phoneVerifiedAt: Date | null;
    emailVerifiedAt: Date | null;
  };
  tenant: { id: string; name: string; displayName: string | null } | null;
  decidedBy: { id: string; fullName: string | null; username: string | null } | null;
};

const STATUS_API: Record<AuthorizationCaseStatus, string> = {
  [AuthorizationCaseStatus.DRAFT]: 'draft',
  [AuthorizationCaseStatus.PENDING_REVIEW]: 'pending_review',
  [AuthorizationCaseStatus.NEEDS_MORE_INFO]: 'needs_more_info',
  [AuthorizationCaseStatus.REJECTED]: 'rejected',
  [AuthorizationCaseStatus.APPROVED]: 'approved',
};

const CHALLENGE_API: Record<ContactChallengeState, string> = {
  [ContactChallengeState.UNVERIFIED]: 'unverified',
  [ContactChallengeState.PENDING]: 'pending',
  [ContactChallengeState.VERIFIED]: 'verified',
  [ContactChallengeState.SKIPPED_ALREADY_VERIFIED]: 'skipped_already_verified',
};

function packageDto(row: CaseRow) {
  return {
    nationalId: row.nationalId,
    birthDate: row.birthDate,
    mobile: row.mobile,
    mobileChallenge: CHALLENGE_API[row.mobileChallenge],
    mobileBelongsToNationalId: row.mobileBelongsToNationalId,
    email: row.email,
    emailChallenge: CHALLENGE_API[row.emailChallenge],
    province: row.province,
    city: row.city,
    address: row.address,
    postalCode: row.postalCode,
    nationalIdCardFileName: row.nationalIdCardFileName,
    attestedTruthful: row.attestedTruthful,
  };
}

export function toCustomerAuthorizationCaseDto(row: CaseRow) {
  return {
    id: row.id,
    status: STATUS_API[row.status],
    package: packageDto(row),
    staffReason: row.staffReason,
    staffFieldsToFix: row.staffFieldsToFix,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminAuthorizationCaseDto(row: AdminCaseRow) {
  const displayName =
    row.user.fullName?.trim() ||
    row.user.phoneNumber ||
    row.user.email ||
    row.user.id;

  return {
    id: row.id,
    userId: row.userId,
    userDisplayName: displayName,
    userEmail: row.user.email,
    userMobile: row.user.phoneNumber,
    status: STATUS_API[row.status],
    package: {
      ...packageDto(row),
      nationalIdCardPreviewLabel: row.nationalIdCardFileName
        ? `فایل: ${row.nationalIdCardFileName}`
        : 'بدون فایل',
    },
    relatedPlanRequestIds: [] as string[],
    staffReason: row.staffReason,
    staffFieldsToFix: row.staffFieldsToFix,
    submittedAt: row.submittedAt?.toISOString() ?? row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decidedBy:
      row.decidedBy?.fullName?.trim() ||
      row.decidedBy?.username ||
      null,
    tenantId: row.tenantId,
    tenantName: row.tenant?.displayName || row.tenant?.name || null,
    history: [] as Array<{
      id: string;
      at: string;
      action: string;
      actorName: string;
      note?: string | null;
    }>,
  };
}

/** Map API snake challenge strings from client to Prisma enum. */
export function parseChallengeState(
  value: string,
): ContactChallengeState | null {
  const entry = Object.entries(CHALLENGE_API).find(([, v]) => v === value);
  return entry ? (entry[0] as ContactChallengeState) : null;
}
