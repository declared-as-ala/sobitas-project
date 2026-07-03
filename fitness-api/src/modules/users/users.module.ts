import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, RedisService],
  exports: [UsersService],
})
export class UsersModule {}
