import { Module } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService, PrismaService, RedisService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
