import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// import { JwtPayload } from 'src/modules/authentication/types';

// export const CurrentUser = createParamDecorator(
//   (data: keyof JwtPayload | undefined, context: ExecutionContext) => {
//     const request = context.switchToHttp().getRequest();

//     if (!data) return { ...request.originalUser, ...request.user };

//     return { ...request.originalUser, ...request.user }[data];
//   },
// );
