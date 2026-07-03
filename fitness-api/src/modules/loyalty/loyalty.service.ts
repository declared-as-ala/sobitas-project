import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RedeemCodeDto } from './dto/redeem-code.dto';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  // ── Loyalty Points & Tier Engine ─────────────────────────────────

  async getLoyaltySummary(userId: number) {
    // 1. Fetch all fitness loyalty transactions
    const transactions = await this.prisma.loyaltyPointTransaction.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    const fitnessPoints = transactions.reduce((sum, tx) => sum + tx.points, 0);

    // 2. Determine Tier
    let tier = 'Bronze';
    let nextTier = 'Silver';
    let nextTierThreshold = 500;
    let discountPercent = 0;

    if (fitnessPoints >= 5000) {
      tier = 'Elite';
      nextTier = 'Max';
      nextTierThreshold = 5000;
      discountPercent = 15;
    } else if (fitnessPoints >= 1500) {
      tier = 'Gold';
      nextTier = 'Elite';
      nextTierThreshold = 5000;
      discountPercent = 10;
    } else if (fitnessPoints >= 500) {
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

  // ── Referral System ──────────────────────────────────────────────

  async getReferralData(userId: number) {
    // Generate a unique referral code if not already saved
    // We can use a deterministic code format, e.g. PT-NOM-USERID
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cleanedName = user.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const referralCode = `PT-${cleanedName}-${userId}`;

    // Get referees referred by this user
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

  async redeemCode(userId: number, dto: RedeemCodeDto) {
    // Check if user is trying to redeem their own code
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cleanedName = user.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const ownCode = `PT-${cleanedName}-${userId}`;

    if (dto.referralCode === ownCode) {
      throw new BadRequestException('You cannot redeem your own referral code.');
    }

    // Parse referrer ID from code (PT-NAME-ID)
    const codeParts = dto.referralCode.split('-');
    const referrerIdStr = codeParts[codeParts.length - 1];
    
    if (!referrerIdStr || isNaN(parseInt(referrerIdStr, 10))) {
      throw new BadRequestException('Invalid referral code format.');
    }

    const referrerId = parseInt(referrerIdStr, 10);

    // Verify referrer exists
    const referrer = await this.prisma.user.findUnique({
      where: { id: BigInt(referrerId) },
    });

    if (!referrer) {
      throw new BadRequestException('Referral code does not exist.');
    }

    // Check if this user has already been referred
    const existingReferral = await this.prisma.referral.findFirst({
      where: { refereeId: BigInt(userId) },
    });

    if (existingReferral) {
      throw new BadRequestException('You have already redeemed a referral code.');
    }

    // Create the referral relationship
    const referral = await this.prisma.referral.create({
      data: {
        referrerId: BigInt(referrerId),
        refereeId: BigInt(userId),
        referralCode: dto.referralCode,
        status: 'pending',
      },
    });

    // Award 50 points immediately to the referee for redeeming the code
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

  // Admin: Complete a referral when the referee places their first order
  async completeReferral(refereeId: number) {
    const referral = await this.prisma.referral.findUnique({
      where: { refereeId: BigInt(refereeId) },
    });

    if (referral && referral.status === 'pending') {
      // Mark as completed
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'completed' },
      });

      // Award 100 points to the referrer
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
}
