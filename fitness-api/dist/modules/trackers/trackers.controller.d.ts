import { TrackersService } from './trackers.service';
import { LogWaterDto } from './dto/log-water.dto';
import { LogProteinDto } from './dto/log-protein.dto';
import { LogBodyProgressDto } from './dto/log-body-progress.dto';
import { UserSession } from '../../auth/current-user.decorator';
export declare class TrackersController {
    private readonly trackersService;
    constructor(trackersService: TrackersService);
    logWater(user: UserSession, dto: LogWaterDto): Promise<{
        id: number;
        createdAt: Date;
        userId: bigint;
        amount: number;
        date: string;
    }>;
    getWaterLogs(user: UserSession, date: string): Promise<{
        date: string;
        total: number;
        logs: {
            id: number;
            createdAt: Date;
            userId: bigint;
            amount: number;
            date: string;
        }[];
    }>;
    logProtein(user: UserSession, dto: LogProteinDto): Promise<{
        id: number;
        createdAt: Date;
        description: string | null;
        userId: bigint;
        date: string;
        mealType: string;
        proteinAmount: number;
    }>;
    getProteinLogs(user: UserSession, date: string): Promise<{
        date: string;
        total: number;
        logs: {
            id: number;
            createdAt: Date;
            description: string | null;
            userId: bigint;
            date: string;
            mealType: string;
            proteinAmount: number;
        }[];
    }>;
    logBodyProgress(user: UserSession, dto: LogBodyProgressDto): Promise<{
        id: number;
        createdAt: Date;
        weight: number;
        userId: bigint;
        date: string;
        chest: number | null;
        waist: number | null;
        arms: number | null;
        legs: number | null;
        bodyFatPercentage: number | null;
        progressPhotoUrl: string | null;
    }>;
    getBodyProgress(user: UserSession): Promise<{
        history: {
            id: number;
            createdAt: Date;
            weight: number;
            userId: bigint;
            date: string;
            chest: number | null;
            waist: number | null;
            arms: number | null;
            legs: number | null;
            bodyFatPercentage: number | null;
            progressPhotoUrl: string | null;
        }[];
        weeklyChange: number;
        monthlyChange: number;
    }>;
}
