import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LogWorkoutDto } from './dto/log-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  // ── Workout Programs ─────────────────────────────────────────────

  async getPrograms(category?: string) {
    return this.prisma.workoutProgram.findMany({
      where: category ? { category } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProgramById(id: number) {
    const program = await this.prisma.workoutProgram.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!program) {
      throw new NotFoundException(`Workout program with ID ${id} not found.`);
    }

    return program;
  }

  // ── Workout Logs ─────────────────────────────────────────────────

  async logWorkout(userId: number, dto: LogWorkoutDto) {
    // Check if exercise exists
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: dto.exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${dto.exerciseId} not found.`);
    }

    const log = await this.prisma.workoutLog.create({
      data: {
        userId: BigInt(userId),
        exerciseId: dto.exerciseId,
        weightUsed: dto.weightUsed,
        repsCompleted: dto.repsCompleted,
        setsCompleted: dto.setsCompleted,
        notes: dto.notes,
        date: dto.date,
      },
    });

    // Loyalty point awarding rules:
    // Award 20 points per workout log, up to max 2 exercises logged per day (max 40 points total).
    const dailyLogsCount = await this.prisma.workoutLog.count({
      where: {
        userId: BigInt(userId),
        date: dto.date,
      },
    });

    if (dailyLogsCount <= 2) {
      await this.prisma.loyaltyPointTransaction.create({
        data: {
          userId: BigInt(userId),
          points: 20,
          source: 'workout',
          notes: `Loyalty points awarded for workout exercise log on ${dto.date}`,
        },
      });
    }

    return log;
  }

  async getWorkoutLogs(userId: number, date?: string) {
    return this.prisma.workoutLog.findMany({
      where: {
        userId: BigInt(userId),
        ...(date ? { date } : {}),
      },
      include: {
        exercise: {
          select: {
            name: true,
            sets: true,
            reps: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
