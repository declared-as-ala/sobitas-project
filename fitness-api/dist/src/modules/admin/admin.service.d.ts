import { PrismaService } from '../../prisma.service';
import { CreateWorkoutProgramDto } from './dto/create-workout-program.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(): Promise<{
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
    createWorkoutProgram(dto: CreateWorkoutProgramDto): Promise<{
        name: string;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
        createdAt: Date;
        id: number;
    }>;
    addExerciseToProgram(programId: number, dto: CreateExerciseDto): Promise<{
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
    createOrUpdateTemplate(dto: CreateTemplateDto): Promise<{
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
