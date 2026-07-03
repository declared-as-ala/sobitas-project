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
        name: string;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
        createdAt: Date;
        id: number;
    }>;
    addExercise(programId: string, dto: CreateExerciseDto): Promise<{
        name: string;
        id: number;
        sets: number;
        reps: string;
        restTime: number;
        notes: string | null;
        videoUrl: string | null;
        orderIndex: number;
        programId: number;
    }>;
    createTemplate(dto: CreateTemplateDto): Promise<{
        createdAt: Date;
        id: number;
        type: string;
        title: string;
        body: string;
    }>;
    getTemplates(): Promise<{
        createdAt: Date;
        id: number;
        type: string;
        title: string;
        body: string;
    }[]>;
}
