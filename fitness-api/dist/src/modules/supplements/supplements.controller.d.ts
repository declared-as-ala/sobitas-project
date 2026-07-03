import { SupplementsService } from './supplements.service';
import { AddToStackDto } from './dto/add-to-stack.dto';
import { UserSession } from '../../auth/current-user.decorator';
export declare class SupplementsController {
    private readonly supplementsService;
    constructor(supplementsService: SupplementsService);
    getRecommendations(goal: string): Promise<any[]>;
    getStack(user: UserSession): Promise<{
        createdAt: Date;
        id: number;
        notes: string | null;
        userId: bigint;
        timing: string;
        productName: string;
        servingSize: string;
        dailyServing: number;
        totalServings: number;
        servingsRemaining: number;
        refillReminderEnabled: boolean;
        purchaseDate: string;
    }[]>;
    addToStack(user: UserSession, dto: AddToStackDto): Promise<{
        createdAt: Date;
        id: number;
        notes: string | null;
        userId: bigint;
        timing: string;
        productName: string;
        servingSize: string;
        dailyServing: number;
        totalServings: number;
        servingsRemaining: number;
        refillReminderEnabled: boolean;
        purchaseDate: string;
    }>;
    deleteFromStack(user: UserSession, id: string): Promise<{
        success: boolean;
    }>;
    getRefillReminders(user: UserSession): Promise<any[]>;
}
