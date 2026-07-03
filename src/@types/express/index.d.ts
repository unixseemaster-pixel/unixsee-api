import type { User as PrismaUser } from '@prisma/client';

export type CurrentUserType = Omit<PrismaUser, 'password' | 'hashedRt'> & {
  sub: string;
  iat: number;
  exp: number;
  refreshToken?: string | null; // will be add by refresh-token.strategy
};

declare global {
  namespace Express {
    interface User extends CurrentUserType {}

    interface Request {
      user?: User;
      requestId?: string;
      vpsMachineId?: string;
      isFirstProvisioningCycle?: boolean;
    }
  }
}

export {};
