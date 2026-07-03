import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LogWaterDto } from './dto/log-water.dto';
import { LogProteinDto } from './dto/log-protein.dto';
import { LogBodyProgressDto } from './dto/log-body-progress.dto';

@Injectable()
export class TrackersService {
  constructor(private prisma: PrismaService) {}

  // ── Water Logging ────────────────────────────────────────────────

  async logWater(userId: number, dto: LogWaterDto) {
    // Check if this is the first water log of the day (for daily check-in points)
    const existingLogs = await this.prisma.waterLog.findFirst({
      where: {
        userId: BigInt(userId),
        date: dto.date,
      },
    });

    const waterLog = await this.prisma.waterLog.create({
      data: {
        userId: BigInt(userId),
        amount: dto.amount,
        date: dto.date,
      },
    });

    // If it's the first log of the day, award 10 check-in loyalty points
    if (!existingLogs) {
      await this.prisma.loyaltyPointTransaction.create({
        data: {
          userId: BigInt(userId),
          points: 10,
          source: 'check_in',
          notes: `Daily fitness check-in for logging water on ${dto.date}`,
        },
      });
    }

    return waterLog;
  }

  async getWaterLogs(userId: number, date: string) {
    const logs = await this.prisma.waterLog.findMany({
      where: {
        userId: BigInt(userId),
        date,
      },
      orderBy: { createdAt: 'asc' },
    });

    const total = logs.reduce((sum, log) => sum + log.amount, 0);

    return {
      date,
      total,
      logs,
    };
  }

  // ── Protein Logging ──────────────────────────────────────────────

  async logProtein(userId: number, dto: LogProteinDto) {
    return this.prisma.proteinLog.create({
      data: {
        userId: BigInt(userId),
        mealType: dto.mealType,
        proteinAmount: dto.proteinAmount,
        description: dto.description,
        date: dto.date,
      },
    });
  }

  async getProteinLogs(userId: number, date: string) {
    const logs = await this.prisma.proteinLog.findMany({
      where: {
        userId: BigInt(userId),
        date,
      },
      orderBy: { createdAt: 'asc' },
    });

    const total = logs.reduce((sum, log) => sum + log.proteinAmount, 0);

    return {
      date,
      total,
      logs,
    };
  }

  // ── Body Progress ────────────────────────────────────────────────

  async logBodyProgress(userId: number, dto: LogBodyProgressDto) {
    // Upsert progress for the given date
    const progress = await this.prisma.bodyProgress.create({
      data: {
        userId: BigInt(userId),
        weight: dto.weight,
        chest: dto.chest,
        waist: dto.waist,
        arms: dto.arms,
        legs: dto.legs,
        bodyFatPercentage: dto.bodyFatPercentage,
        progressPhotoUrl: dto.progressPhotoUrl,
        date: dto.date,
      },
    });

    // Update weight in current fitness profile if one exists
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (profile) {
      await this.prisma.fitnessProfile.update({
        where: { userId: BigInt(userId) },
        data: { weight: dto.weight },
      });
    }

    return progress;
  }

  async getBodyProgressLogs(userId: number) {
    const history = await this.prisma.bodyProgress.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { date: 'asc' },
    });

    // Generate comparison calculations if there are multiple logs
    const totalLogs = history.length;
    let weightDiffWeekly = 0;
    let weightDiffMonthly = 0;

    if (totalLogs >= 2) {
      const latest = history[totalLogs - 1];
      
      // Weekly diff (find a log around 7 days ago)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekLog = history.find(log => new Date(log.date) <= sevenDaysAgo);
      if (weekLog && latest) {
        weightDiffWeekly = latest.weight - weekLog.weight;
      }

      // Monthly diff (find a log around 30 days ago)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const monthLog = history.find(log => new Date(log.date) <= thirtyDaysAgo);
      if (monthLog && latest) {
        weightDiffMonthly = latest.weight - monthLog.weight;
      }
    }

    return {
      history,
      weeklyChange: Number(weightDiffWeekly.toFixed(2)),
      monthlyChange: Number(weightDiffMonthly.toFixed(2)),
    };
  }
}
