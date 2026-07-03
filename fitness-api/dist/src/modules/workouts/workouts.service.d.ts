import { PrismaService } from '../../prisma.service';
import { LogWorkoutDto } from './dto/log-workout.dto';
export declare class WorkoutsService {
    private prisma;
    constructor(prisma: PrismaService);
    getPrograms(category?: string): Promise<{
        name: string;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
        createdAt: Date;
        id: number;
    }[]>;
    getProgramById(id: number): Promise<{
        exercises: {
            name: string;
            id: number;
            sets: number;
            reps: string;
            restTime: number;
            notes: string | null;
            videoUrl: string | null;
            orderIndex: number;
            programId: number;
        }[];
    } & {
        name: string;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
        createdAt: Date;
        id: number;
    }>;
    logWorkout(userId: number, dto: LogWorkoutDto): Promise<{
        createdAt: Date;
        id: number;
        notes: string | null;
        userId: bigint;
        date: string;
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
        createdAt: Date;
        id: number;
        notes: string | null;
        userId: bigint;
        date: string;
        exerciseId: number;
        weightUsed: number;
        repsCompleted: number;
        setsCompleted: number;
    })[]>;
}
