import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, RedisService],
  exports: [AdminService],
})
export class AdminModule {}
