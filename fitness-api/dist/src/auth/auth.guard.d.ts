import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';
export declare class AuthGuard implements CanActivate {
    private prisma;
    private redis;
    constructor(prisma: PrismaService, redis: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
