import { AdminService } from './admin.service';
import { CreateWorkoutProgramDto } from './dto/create-workout-program.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        totalRegisteredUsers: number;
        onboardedFitnessUsers: number;
        goalsDistribution: {
            goal: string;
            count: number;
        }[];
        totalWorkoutsLogged: number;
        totalReferrals: number;
        topActiveUsers: any[];
    }>;
    createProgram(dto: CreateWorkoutProgramDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
    }>;
    addExercise(programId: string, dto: CreateExerciseDto): Promise<{
        id: number;
        name: string;
        notes: string | null;
        orderIndex: number;
        programId: number;
        sets: number;
        reps: string;
        restTime: number;
        videoUrl: string | null;
    }>;
    createTemplate(dto: CreateTemplateDto): Promise<{
        type: string;
        id: number;
        createdAt: Date;
        title: string;
        body: string;
    }>;
    getTemplates(): Promise<{
        type: string;
        id: number;
        createdAt: Date;
        title: string;
        body: string;
    }[]>;
}
