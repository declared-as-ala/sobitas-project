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
exports.TrackersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let TrackersService = class TrackersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logWater(userId, dto) {
        const existingLogs = await this.prisma.waterLog.findFirst({
            where: {
                userId: BigInt(userId),
                date: dto.date,
            },
        });
        const waterLog = await this.prisma.waterLog.create({
            data: {
                userId: BigInt(userId),
                amount: dto.amount,
                date: dto.date,
            },
        });
        if (!existingLogs) {
            await this.prisma.loyaltyPointTransaction.create({
                data: {
                    userId: BigInt(userId),
                    points: 10,
                    source: 'check_in',
                    notes: `Daily fitness check-in for logging water on ${dto.date}`,
                },
            });
        }
        return waterLog;
    }
    async getWaterLogs(userId, date) {
        const logs = await this.prisma.waterLog.findMany({
            where: {
                userId: BigInt(userId),
                date,
            },
            orderBy: { createdAt: 'asc' },
        });
        const total = logs.reduce((sum, log) => sum + log.amount, 0);
        return {
            date,
            total,
            logs,
        };
    }
    async logProtein(userId, dto) {
        return this.prisma.proteinLog.create({
            data: {
                userId: BigInt(userId),
                mealType: dto.mealType,
                proteinAmount: dto.proteinAmount,
                description: dto.description,
                date: dto.date,
            },
        });
    }
    async getProteinLogs(userId, date) {
        const logs = await this.prisma.proteinLog.findMany({
            where: {
                userId: BigInt(userId),
                date,
            },
            orderBy: { createdAt: 'asc' },
        });
        const total = logs.reduce((sum, log) => sum + log.proteinAmount, 0);
        return {
            date,
            total,
            logs,
        };
    }
    async logBodyProgress(userId, dto) {
        const progress = await this.prisma.bodyProgress.create({
            data: {
                userId: BigInt(userId),
                weight: dto.weight,
                chest: dto.chest,
                waist: dto.waist,
                arms: dto.arms,
                legs: dto.legs,
                bodyFatPercentage: dto.bodyFatPercentage,
                progressPhotoUrl: dto.progressPhotoUrl,
                date: dto.date,
            },
        });
        const profile = await this.prisma.fitnessProfile.findUnique({
            where: { userId: BigInt(userId) },
        });
        if (profile) {
            await this.prisma.fitnessProfile.update({
                where: { userId: BigInt(userId) },
                data: { weight: dto.weight },
            });
        }
        return progress;
    }
    async getBodyProgressLogs(userId) {
        const history = await this.prisma.bodyProgress.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { date: 'asc' },
        });
        const totalLogs = history.length;
        let weightDiffWeekly = 0;
        let weightDiffMonthly = 0;
        if (totalLogs >= 2) {
            const latest = history[totalLogs - 1];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const weekLog = history.find(log => new Date(log.date) <= sevenDaysAgo);
            if (weekLog && latest) {
                weightDiffWeekly = latest.weight - weekLog.weight;
            }
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const monthLog = history.find(log => new Date(log.date) <= thirtyDaysAgo);
            if (monthLog && latest) {
                weightDiffMonthly = latest.weight - monthLog.weight;
            }
        }
        return {
            history,
            weeklyChange: Number(weightDiffWeekly.toFixed(2)),
            monthlyChange: Number(weightDiffMonthly.toFixed(2)),
        };
    }
};
exports.TrackersService = TrackersService;
exports.TrackersService = TrackersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TrackersService);
//# sourceMappingURL=trackers.service.js.map