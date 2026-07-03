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
        id: number;
        name: string;
        createdAt: Date;
        description: string;
        category: string;
        difficulty: string;
        imageUrl: string | null;
    }>;
    addExerciseToProgram(programId: number, dto: CreateExerciseDto): Promise<{
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
    createOrUpdateTemplate(dto: CreateTemplateDto): Promise<{
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
