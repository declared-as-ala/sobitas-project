import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or invalid');
    }

    const tokenString = authHeader.split(' ')[1];
    if (!tokenString) {
      throw new UnauthorizedException('Bearer token missing');
    }

    try {
      // 1. Check Redis cache first
      const cacheKey = `auth:session:${crypto.createHash('sha256').update(tokenString).digest('hex')}`;
      const cachedUser = await this.redis.get(cacheKey);

      if (cachedUser) {
        request.user = JSON.parse(cachedUser);
        return true;
      }

      // 2. Parse token (Sanctum format: id|token_value)
      let tokenId: number | null = null;
      let tokenValue = tokenString;

      if (tokenString.includes('|')) {
        const parts = tokenString.split('|');
        const idStr = parts[0];
        const valStr = parts[1];
        if (idStr && valStr) {
          tokenId = parseInt(idStr, 10);
          tokenValue = valStr;
        }
      }

      // Hash the token value using SHA-256 (matching Sanctum)
      const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');

      // 3. Find token in shared MySQL personal_access_tokens
      let tokenRecord: any = null;
      if (tokenId !== null && !isNaN(tokenId)) {
        tokenRecord = await this.prisma.personalAccessToken.findUnique({
          where: { id: BigInt(tokenId) },
        });
      } else {
        // Fallback: search by token hash directly (for older or unformatted tokens)
        tokenRecord = await this.prisma.personalAccessToken.findFirst({
          where: { token: tokenHash },
        });
      }

      if (!tokenRecord || tokenRecord.token !== tokenHash) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // 4. Retrieve Laravel User from MySQL
      const user = await this.prisma.user.findUnique({
        where: { id: tokenRecord.tokenableId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          roleId: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User account not found');
      }

      // Format bigint ID as number/string for compatibility
      const formattedUser = {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleId: user.roleId ? Number(user.roleId) : null,
      };

      // 5. Cache user session in Redis (TTL: 5 minutes)
      await this.redis.set(cacheKey, JSON.stringify(formattedUser), 300);

      // Attach user object to the request context
      request.user = formattedUser;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
