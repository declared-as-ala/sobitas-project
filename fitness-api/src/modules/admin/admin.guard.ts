import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Role IDs 1 (Admin) and 3 (Manager/Staff) are authorized.
    // Standard clients have roleId = 2.
    const isAdmin = user.roleId === 1 || user.roleId === 3;

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden: Admin capabilities required.');
    }

    return true;
  }
}
