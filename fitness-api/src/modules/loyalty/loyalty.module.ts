import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, PrismaService, RedisService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
