import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateWorkoutProgramDto } from './dto/create-workout-program.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard Statistics & Insights ──────────────────────────────

  async getDashboardStats() {
    // 1. Core user metrics
    const totalUsers = await this.prisma.user.count();
    const fitnessProfilesCount = await this.prisma.fitnessProfile.count();

    // 2. Goal distributions
    const goalCounts = await this.prisma.fitnessProfile.groupBy({
      by: ['goal'],
      _count: {
        userId: true,
      },
    });

    const goalsDistribution = goalCounts.map(g => ({
      goal: g.goal,
      count: g._count.userId,
    }));

    // 3. User engagement
    const totalWorkoutsLogged = await this.prisma.workoutLog.count();
    const totalReferrals = await this.prisma.referral.count();

    // 4. Top active users (users with most logged workout exercises)
    const activeUsersList = await this.prisma.workoutLog.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const topUsers: any[] = [];
    for (const item of activeUsersList) {
      const user = await this.prisma.user.findUnique({
        where: { id: item.userId },
        select: { name: true, email: true },
      });
      if (user) {
        topUsers.push({
          userId: Number(item.userId),
          name: user.name,
          email: user.email,
          workoutCount: item._count.id,
        });
      }
    }

    return {
      totalRegisteredUsers: totalUsers,
      onboardedFitnessUsers: fitnessProfilesCount,
      goalsDistribution,
      totalWorkoutsLogged,
      totalReferrals,
      topActiveUsers: topUsers,
    };
  }

  // ── Workout Creation ─────────────────────────────────────────────

  async createWorkoutProgram(dto: CreateWorkoutProgramDto) {
    return this.prisma.workoutProgram.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        difficulty: dto.difficulty,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async addExerciseToProgram(programId: number, dto: CreateExerciseDto) {
    const program = await this.prisma.workoutProgram.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException(`Workout program with ID ${programId} not found.`);
    }

    return this.prisma.exercise.create({
      data: {
        programId,
        name: dto.name,
        sets: dto.sets,
        reps: dto.reps,
        restTime: dto.restTime,
        notes: dto.notes,
        videoUrl: dto.videoUrl,
        orderIndex: dto.orderIndex,
      },
    });
  }

  // ── Notification Templates ───────────────────────────────────────

  async createOrUpdateTemplate(dto: CreateTemplateDto) {
    return this.prisma.notificationTemplate.upsert({
      where: { type: dto.type },
      update: {
        title: dto.title,
        body: dto.body,
      },
      create: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
      },
    });
  }

  async getTemplates() {
    return this.prisma.notificationTemplate.findMany();
  }
}
