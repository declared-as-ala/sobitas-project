import { Module } from '@nestjs/common';
import { WorkoutPlanService } from './workout-plan.service';
import { WorkoutPlanController } from './workout-plan.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [WorkoutPlanController],
  providers: [WorkoutPlanService, PrismaService, RedisService, ConfigService],
  exports: [WorkoutPlanService],
})
export class WorkoutPlanModule {}
