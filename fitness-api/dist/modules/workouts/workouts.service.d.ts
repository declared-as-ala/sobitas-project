import { PrismaService } from '../../prisma.service';
import { LogWorkoutDto } from './dto/log-workout.dto';
export declare class WorkoutsService {
    private prisma;
    constructor(prisma: PrismaService);
    getPrograms(category?: string): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
    }[]>;
    getProgramById(id: number): Promise<{
        exercises: {
            id: number;
            name: string;
            notes: string | null;
            orderIndex: number;
            programId: number;
            sets: number;
            reps: string;
            restTime: number;
            videoUrl: string | null;
        }[];
    } & {
        id: number;
        name: string;
        createdAt: Date;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
    }>;
    logWorkout(userId: number, dto: LogWorkoutDto): Promise<{
        id: number;
        createdAt: Date;
        userId: bigint;
        date: string;
        notes: string | null;
        exerciseId: number;
        weightUsed: number;
        repsCompleted: number;
        setsCompleted: number;
    }>;
    getWorkoutLogs(userId: number, date?: string): Promise<({
        exercise: {
            name: string;
            sets: number;
            reps: string;
        };
    } & {
        id: number;
        createdAt: Date;
        userId: bigint;
        date: string;
        notes: string | null;
        exerciseId: number;
        weightUsed: number;
        repsCompleted: number;
        setsCompleted: number;
    })[]>;
}
