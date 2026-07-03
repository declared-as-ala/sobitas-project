import { Module } from '@nestjs/common';
import { MealScanService } from './meal-scan.service';
import { MealScanController } from './meal-scan.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [MealScanController],
  providers: [MealScanService, PrismaService, RedisService, ConfigService],
  exports: [MealScanService],
})
export class MealScanModule {}
