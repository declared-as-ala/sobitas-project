import { LoyaltyService } from './loyalty.service';
import { RedeemCodeDto } from './dto/redeem-code.dto';
import { UserSession } from '../../auth/current-user.decorator';
export declare class LoyaltyController {
    private readonly loyaltyService;
    constructor(loyaltyService: LoyaltyService);
    getLoyaltySummary(user: UserSession): Promise<{
        points: number;
        tier: string;
        nextTier: string;
        pointsToNextTier: number;
        progressPercent: number;
        discountPercent: number;
        history: {
            createdAt: Date;
            id: number;
            notes: string | null;
            userId: bigint;
            points: number;
            source: string;
        }[];
    }>;
    getReferralData(user: UserSession): Promise<{
        referralCode: string;
        referralCount: number;
        referees: {
            id: number;
            name: string;
            status: string;
            createdAt: Date;
        }[];
    }>;
    redeemCode(user: UserSession, dto: RedeemCodeDto): Promise<{
        success: boolean;
        message: string;
        referral: {
            createdAt: Date;
            id: number;
            referralCode: string;
            referrerId: bigint;
            refereeId: bigint | null;
            status: string;
        };
    }>;
}
