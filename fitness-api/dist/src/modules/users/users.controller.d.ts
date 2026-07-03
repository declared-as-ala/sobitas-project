import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UserSession } from '../../auth/current-user.decorator';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: UserSession): Promise<{
        createdAt: Date;
        id: number;
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
    createOrUpdateProfile(user: UserSession, dto: CreateProfileDto): Promise<{
        createdAt: Date;
        id: number;
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
}
