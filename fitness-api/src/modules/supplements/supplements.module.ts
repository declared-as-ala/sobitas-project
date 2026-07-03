import { Module } from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { SupplementsController } from './supplements.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Module({
  controllers: [SupplementsController],
  providers: [SupplementsService, PrismaService, RedisService],
  exports: [SupplementsService],
})
export class SupplementsModule {}
