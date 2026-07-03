import { Module } from '@nestjs/common';
import { TrackersService } from './trackers.service';
import { TrackersController } from './trackers.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Module({
  controllers: [TrackersController],
  providers: [TrackersService, PrismaService, RedisService],
  exports: [TrackersService],
})
export class TrackersModule {}
