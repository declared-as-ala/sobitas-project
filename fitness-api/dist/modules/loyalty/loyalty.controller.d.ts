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
            id: number;
            createdAt: Date;
            userId: bigint;
            points: number;
            source: string;
            notes: string | null;
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
            id: number;
            createdAt: Date;
            referralCode: string;
            referrerId: bigint;
            refereeId: bigint | null;
            status: string;
        };
    }>;
}
