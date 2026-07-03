import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';

@Global()
@Module({
  providers: [AuthGuard, PrismaService, RedisService],
  exports: [AuthGuard],
})
export class AuthModule {}
