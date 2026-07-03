import { PrismaService } from '../../prisma.service';
import { LogWaterDto } from './dto/log-water.dto';
import { LogProteinDto } from './dto/log-protein.dto';
import { LogBodyProgressDto } from './dto/log-body-progress.dto';
export declare class TrackersService {
    private prisma;
    constructor(prisma: PrismaService);
    logWater(userId: number, dto: LogWaterDto): Promise<{
        createdAt: Date;
        id: number;
        userId: bigint;
        amount: number;
        date: string;
    }>;
    getWaterLogs(userId: number, date: string): Promise<{
        date: string;
        total: number;
        logs: {
            createdAt: Date;
            id: number;
            userId: bigint;
            amount: number;
            date: string;
        }[];
    }>;
    logProtein(userId: number, dto: LogProteinDto): Promise<{
        description: string | null;
        createdAt: Date;
        id: number;
        userId: bigint;
        date: string;
        mealType: string;
        proteinAmount: number;
    }>;
    getProteinLogs(userId: number, date: string): Promise<{
        date: string;
        total: number;
        logs: {
            description: string | null;
            createdAt: Date;
            id: number;
            userId: bigint;
            date: string;
            mealType: string;
            proteinAmount: number;
        }[];
    }>;
    logBodyProgress(userId: number, dto: LogBodyProgressDto): Promise<{
        createdAt: Date;
        id: number;
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
    getBodyProgressLogs(userId: number): Promise<{
        history: {
            createdAt: Date;
            id: number;
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
