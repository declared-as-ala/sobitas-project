import { Module } from '@nestjs/common';
import { AiCoachService } from './ai-coach.service';
import { AiCoachController } from './ai-coach.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AiCoachController],
  providers: [AiCoachService, PrismaService, RedisService, ConfigService],
  exports: [AiCoachService],
})
export class AiCoachModule {}
