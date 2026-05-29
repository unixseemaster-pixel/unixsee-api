import { CurrentUserType } from '#/@types/express/index.js';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

type CurrentUserKey = keyof CurrentUserType;

export const CurrentUser = createParamDecorator(
  (data: CurrentUserKey | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest() as Request;
    if (!request.user) return null;

    if (!data) return request.user;

    return request.user[data];
  },
);
