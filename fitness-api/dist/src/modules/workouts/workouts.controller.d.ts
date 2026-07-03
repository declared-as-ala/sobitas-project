import { WorkoutsService } from './workouts.service';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { UserSession } from '../../auth/current-user.decorator';
export declare class WorkoutsController {
    private readonly workoutsService;
    constructor(workoutsService: WorkoutsService);
    getPrograms(category?: string): Promise<{
        name: string;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
        createdAt: Date;
        id: number;
    }[]>;
    getProgramById(id: string): Promise<{
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
    logWorkout(user: UserSession, dto: LogWorkoutDto): Promise<{
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
    getWorkoutLogs(user: UserSession, date?: string): Promise<({
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
