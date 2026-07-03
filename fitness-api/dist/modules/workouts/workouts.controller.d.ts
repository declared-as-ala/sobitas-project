import { WorkoutsService } from './workouts.service';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { UserSession } from '../../auth/current-user.decorator';
export declare class WorkoutsController {
    private readonly workoutsService;
    constructor(workoutsService: WorkoutsService);
    getPrograms(category?: string): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
    }[]>;
    getProgramById(id: string): Promise<{
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
    logWorkout(user: UserSession, dto: LogWorkoutDto): Promise<{
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
    getWorkoutLogs(user: UserSession, date?: string): Promise<({
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
