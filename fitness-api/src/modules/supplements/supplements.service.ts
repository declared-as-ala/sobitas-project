import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AddToStackDto } from './dto/add-to-stack.dto';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';

@Injectable()
export class SupplementsService {
  constructor(private prisma: PrismaService) {}

  // ── Supplement Advisor (Dynamic Catalog Query) ───────────────────

  async getRecommendations(goal: string) {
    // 1. Get recommendation rules matching goal
    const rules = await this.prisma.supplementRecommendationRule.findMany({
      where: { goal },
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) {
      return [];
    }

    const recommendations: any[] = [];

    for (const rule of rules) {
      const categories = rule.recommendedCategories.split(',').map(c => c.trim());
      const tags = rule.recommendedTags ? rule.recommendedTags.split(',').map(t => t.trim()) : [];

      // 2. Query Laravel products dynamically based on category terms in product name or description
      const productsList = await this.prisma.product.findMany({
        where: {
          publier: 1, // Only active/published products
          OR: categories.flatMap(cat => [
            { designationFr: { contains: cat } },
            { descriptionFr: { contains: cat } },
          ]),
        },
        select: {
          id: true,
          designationFr: true,
          cover: true,
          prix: true,
          promo: true,
          slug: true,
        },
        take: 6, // Limit recommendations per rule to prevent bloating
      });

      // Filter products by tags if specified
      let filteredProducts = productsList;
      if (tags.length > 0) {
        filteredProducts = productsList.filter(prod => {
          const lowerName = prod.designationFr.toLowerCase();
          return tags.some(tag => lowerName.includes(tag.toLowerCase()));
        });
      }

      recommendations.push({
        ruleId: rule.id,
        goal: rule.goal,
        categoryGroup: rule.recommendedCategories,
        products: filteredProducts.map(p => ({
          id: Number(p.id),
          name: p.designationFr,
          cover: p.cover,
          price: Number(p.prix),
          promoPrice: p.promo ? Number(p.promo) : null,
          slug: p.slug,
        })),
      });
    }

    return recommendations;
  }

  // ── Supplement Stack Planner ─────────────────────────────────────

  async getStack(userId: number) {
    return this.prisma.supplementStack.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addToStack(userId: number, dto: AddToStackDto) {
    return this.prisma.supplementStack.create({
      data: {
        userId: BigInt(userId),
        timing: dto.timing,
        productName: dto.productName,
        servingSize: dto.servingSize,
        dailyServing: dto.dailyServing,
        totalServings: dto.totalServings,
        servingsRemaining: dto.servingsRemaining,
        notes: dto.notes,
        refillReminderEnabled: dto.refillReminderEnabled ?? true,
        purchaseDate: dto.purchaseDate,
      },
    });
  }

  async deleteFromStack(userId: number, id: number) {
    const item = await this.prisma.supplementStack.findUnique({
      where: { id },
    });

    if (!item || item.userId !== BigInt(userId)) {
      throw new NotFoundException(`Supplement stack item with ID ${id} not found.`);
    }

    await this.prisma.supplementStack.delete({
      where: { id },
    });

    return { success: true };
  }

  // ── Refill Reminders Engine ──────────────────────────────────────

  async getRefillReminders(userId: number) {
    const stack = await this.prisma.supplementStack.findMany({
      where: {
        userId: BigInt(userId),
        refillReminderEnabled: true,
      },
    });

    const reminders: any[] = [];

    for (const item of stack) {
      if (item.dailyServing <= 0) continue;

      // Calculate days remaining
      const daysRemaining = Math.floor(item.servingsRemaining / item.dailyServing);

      if (daysRemaining <= 5) {
        reminders.push({
          itemId: item.id,
          productName: item.productName,
          servingsRemaining: item.servingsRemaining,
          daysRemaining: Math.max(0, daysRemaining),
          message: daysRemaining > 0 
            ? `Your ${item.productName} may finish in approximately ${daysRemaining} days. Order again from Protein.tn.`
            : `Your ${item.productName} is finished. Reorder now from Protein.tn!`,
        });
      }
    }

    return reminders;
  }

  // ── Admin Recommendation Rules Management ────────────────────────

  async createRule(dto: CreateRecommendationRuleDto) {
    return this.prisma.supplementRecommendationRule.create({
      data: {
        goal: dto.goal,
        recommendedCategories: dto.recommendedCategories,
        recommendedTags: dto.recommendedTags,
        priority: dto.priority ?? 0,
      },
    });
  }

  async deleteRule(id: number) {
    return this.prisma.supplementRecommendationRule.delete({
      where: { id },
    });
  }
}
