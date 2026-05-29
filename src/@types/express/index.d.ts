import type { User as PrismaUser } from '@prisma/client';

export type CurrentUserType = Omit<PrismaUser, 'password'> & {
  sub: string;
  iat: number;
  exp: number;
  refreshToken?: string | null;
};

declare global {
  namespace Express {
    interface User extends CurrentUserType {}

    interface Request {
      user?: User;
    }
  }
}

export {};
