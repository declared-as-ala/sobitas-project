"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let LoyaltyService = class LoyaltyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLoyaltySummary(userId) {
        const transactions = await this.prisma.loyaltyPointTransaction.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
        });
        const fitnessPoints = transactions.reduce((sum, tx) => sum + tx.points, 0);
        let tier = 'Bronze';
        let nextTier = 'Silver';
        let nextTierThreshold = 500;
        let discountPercent = 0;
        if (fitnessPoints >= 5000) {
            tier = 'Elite';
            nextTier = 'Max';
            nextTierThreshold = 5000;
            discountPercent = 15;
        }
        else if (fitnessPoints >= 1500) {
            tier = 'Gold';
            nextTier = 'Elite';
            nextTierThreshold = 5000;
            discountPercent = 10;
        }
        else if (fitnessPoints >= 500) {
            tier = 'Silver';
            nextTier = 'Gold';
            nextTierThreshold = 1500;
            discountPercent = 5;
        }
        const pointsToNextTier = Math.max(0, nextTierThreshold - fitnessPoints);
        const progressPercent = Math.min(100, Math.round((fitnessPoints / nextTierThreshold) * 100));
        return {
            points: fitnessPoints,
            tier,
            nextTier,
            pointsToNextTier,
            progressPercent,
            discountPercent,
            history: transactions,
        };
    }
    async getReferralData(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: BigInt(userId) },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const cleanedName = user.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        const referralCode = `PT-${cleanedName}-${userId}`;
        const referees = await this.prisma.referral.findMany({
            where: { referrerId: BigInt(userId) },
            include: {
                referee: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return {
            referralCode,
            referralCount: referees.length,
            referees: referees.map(ref => ({
                id: ref.id,
                name: ref.referee?.name ?? 'Anonymous User',
                status: ref.status,
                createdAt: ref.createdAt,
            })),
        };
    }
    async redeemCode(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: BigInt(userId) },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const cleanedName = user.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        const ownCode = `PT-${cleanedName}-${userId}`;
        if (dto.referralCode === ownCode) {
            throw new common_1.BadRequestException('You cannot redeem your own referral code.');
        }
        const codeParts = dto.referralCode.split('-');
        const referrerIdStr = codeParts[codeParts.length - 1];
        if (!referrerIdStr || isNaN(parseInt(referrerIdStr, 10))) {
            throw new common_1.BadRequestException('Invalid referral code format.');
        }
        const referrerId = parseInt(referrerIdStr, 10);
        const referrer = await this.prisma.user.findUnique({
            where: { id: BigInt(referrerId) },
        });
        if (!referrer) {
            throw new common_1.BadRequestException('Referral code does not exist.');
        }
        const existingReferral = await this.prisma.referral.findFirst({
            where: { refereeId: BigInt(userId) },
        });
        if (existingReferral) {
            throw new common_1.BadRequestException('You have already redeemed a referral code.');
        }
        const referral = await this.prisma.referral.create({
            data: {
                referrerId: BigInt(referrerId),
                refereeId: BigInt(userId),
                referralCode: dto.referralCode,
                status: 'pending',
            },
        });
        await this.prisma.loyaltyPointTransaction.create({
            data: {
                userId: BigInt(userId),
                points: 50,
                source: 'referral',
                notes: `Redeemed referral code ${dto.referralCode}`,
            },
        });
        return {
            success: true,
            message: 'Referral code redeemed successfully! 50 bonus points awarded.',
            referral,
        };
    }
    async completeReferral(refereeId) {
        const referral = await this.prisma.referral.findUnique({
            where: { refereeId: BigInt(refereeId) },
        });
        if (referral && referral.status === 'pending') {
            await this.prisma.referral.update({
                where: { id: referral.id },
                data: { status: 'completed' },
            });
            await this.prisma.loyaltyPointTransaction.create({
                data: {
                    userId: referral.referrerId,
                    points: 100,
                    source: 'referral',
                    notes: `Referral bonus awarded for referee completing their first order`,
                },
            });
            return { success: true };
        }
        return { success: false };
    }
};
exports.LoyaltyService = LoyaltyService;
exports.LoyaltyService = LoyaltyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LoyaltyService);
//# sourceMappingURL=loyalty.service.js.map