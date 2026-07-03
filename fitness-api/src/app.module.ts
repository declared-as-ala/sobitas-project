import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TrackersModule } from './modules/trackers/trackers.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { SupplementsModule } from './modules/supplements/supplements.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { AiCoachModule } from './modules/ai-coach/ai-coach.module';
import { MealScanModule } from './modules/meal-scan/meal-scan.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    TrackersModule,
    WorkoutsModule,
    SupplementsModule,
    LoyaltyModule,
    AiCoachModule,
    MealScanModule,
    AdminModule,
  ],
  providers: [PrismaService, RedisService],
})
export class AppModule {}
