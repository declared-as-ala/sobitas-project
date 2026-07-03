import { PrismaService } from '../../prisma.service';
import { AddToStackDto } from './dto/add-to-stack.dto';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';
export declare class SupplementsService {
    private prisma;
    constructor(prisma: PrismaService);
    getRecommendations(goal: string): Promise<any[]>;
    getStack(userId: number): Promise<{
        id: number;
        createdAt: Date;
        userId: bigint;
        notes: string | null;
        timing: string;
        productName: string;
        servingSize: string;
        dailyServing: number;
        totalServings: number;
        servingsRemaining: number;
        refillReminderEnabled: boolean;
        purchaseDate: string;
    }[]>;
    addToStack(userId: number, dto: AddToStackDto): Promise<{
        id: number;
        createdAt: Date;
        userId: bigint;
        notes: string | null;
        timing: string;
        productName: string;
        servingSize: string;
        dailyServing: number;
        totalServings: number;
        servingsRemaining: number;
        refillReminderEnabled: boolean;
        purchaseDate: string;
    }>;
    deleteFromStack(userId: number, id: number): Promise<{
        success: boolean;
    }>;
    getRefillReminders(userId: number): Promise<any[]>;
    createRule(dto: CreateRecommendationRuleDto): Promise<{
        id: number;
        goal: string;
        recommendedCategories: string;
        recommendedTags: string | null;
        priority: number;
    }>;
    deleteRule(id: number): Promise<{
        id: number;
        goal: string;
        recommendedCategories: string;
        recommendedTags: string | null;
        priority: number;
    }>;
}
