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
exports.SupplementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let SupplementsService = class SupplementsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRecommendations(goal) {
        const rules = await this.prisma.supplementRecommendationRule.findMany({
            where: { goal },
            orderBy: { priority: 'desc' },
        });
        if (rules.length === 0) {
            return [];
        }
        const recommendations = [];
        for (const rule of rules) {
            const categories = rule.recommendedCategories.split(',').map(c => c.trim());
            const tags = rule.recommendedTags ? rule.recommendedTags.split(',').map(t => t.trim()) : [];
            const productsList = await this.prisma.product.findMany({
                where: {
                    publier: 1,
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
                take: 6,
            });
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
    async getStack(userId) {
        return this.prisma.supplementStack.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addToStack(userId, dto) {
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
    async deleteFromStack(userId, id) {
        const item = await this.prisma.supplementStack.findUnique({
            where: { id },
        });
        if (!item || item.userId !== BigInt(userId)) {
            throw new common_1.NotFoundException(`Supplement stack item with ID ${id} not found.`);
        }
        await this.prisma.supplementStack.delete({
            where: { id },
        });
        return { success: true };
    }
    async getRefillReminders(userId) {
        const stack = await this.prisma.supplementStack.findMany({
            where: {
                userId: BigInt(userId),
                refillReminderEnabled: true,
            },
        });
        const reminders = [];
        for (const item of stack) {
            if (item.dailyServing <= 0)
                continue;
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
    async createRule(dto) {
        return this.prisma.supplementRecommendationRule.create({
            data: {
                goal: dto.goal,
                recommendedCategories: dto.recommendedCategories,
                recommendedTags: dto.recommendedTags,
                priority: dto.priority ?? 0,
            },
        });
    }
    async deleteRule(id) {
        return this.prisma.supplementRecommendationRule.delete({
            where: { id },
        });
    }
};
exports.SupplementsService = SupplementsService;
exports.SupplementsService = SupplementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupplementsService);
//# sourceMappingURL=supplements.service.js.map