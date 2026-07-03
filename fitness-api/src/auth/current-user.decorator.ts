import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class UserSession {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roleId: number | null;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
