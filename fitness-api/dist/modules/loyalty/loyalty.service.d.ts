import { PrismaService } from '../../prisma.service';
import { RedeemCodeDto } from './dto/redeem-code.dto';
export declare class LoyaltyService {
    private prisma;
    constructor(prisma: PrismaService);
    getLoyaltySummary(userId: number): Promise<{
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
    getReferralData(userId: number): Promise<{
        referralCode: string;
        referralCount: number;
        referees: {
            id: number;
            name: string;
            status: string;
            createdAt: Date;
        }[];
    }>;
    redeemCode(userId: number, dto: RedeemCodeDto): Promise<{
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
    completeReferral(refereeId: number): Promise<{
        success: boolean;
    }>;
}
