import { PrismaService } from '../../prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        gender: string;
        age: number;
        height: number;
        weight: number;
        activityLevel: string;
        goal: string;
        trainingLocation: string;
        experienceLevel: string;
        dietaryPreference: string;
        trainingDaysPerWeek: number;
        userId: bigint;
        dailyCalorieTarget: number;
        dailyProteinTarget: number;
        dailyCarbsTarget: number;
        dailyFatTarget: number;
        dailyWaterTarget: number;
    }>;
    createOrUpdateProfile(userId: number, dto: CreateProfileDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        gender: string;
        age: number;
        height: number;
        weight: number;
        activityLevel: string;
        goal: string;
        trainingLocation: string;
        experienceLevel: string;
        dietaryPreference: string;
        trainingDaysPerWeek: number;
        userId: bigint;
        dailyCalorieTarget: number;
        dailyProteinTarget: number;
        dailyCarbsTarget: number;
        dailyFatTarget: number;
        dailyWaterTarget: number;
    }>;
    private calculateTargets;
}
