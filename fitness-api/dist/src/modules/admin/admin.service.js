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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats() {
        const totalUsers = await this.prisma.user.count();
        const fitnessProfilesCount = await this.prisma.fitnessProfile.count();
        const goalCounts = await this.prisma.fitnessProfile.groupBy({
            by: ['goal'],
            _count: {
                userId: true,
            },
        });
        const goalsDistribution = goalCounts.map(g => ({
            goal: g.goal,
            count: g._count.userId,
        }));
        const totalWorkoutsLogged = await this.prisma.workoutLog.count();
        const totalReferrals = await this.prisma.referral.count();
        const activeUsersList = await this.prisma.workoutLog.groupBy({
            by: ['userId'],
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 5,
        });
        const topUsers = [];
        for (const item of activeUsersList) {
            const user = await this.prisma.user.findUnique({
                where: { id: item.userId },
                select: { name: true, email: true },
            });
            if (user) {
                topUsers.push({
                    userId: Number(item.userId),
                    name: user.name,
                    email: user.email,
                    workoutCount: item._count.id,
                });
            }
        }
        return {
            totalRegisteredUsers: totalUsers,
            onboardedFitnessUsers: fitnessProfilesCount,
            goalsDistribution,
            totalWorkoutsLogged,
            totalReferrals,
            topActiveUsers: topUsers,
        };
    }
    async createWorkoutProgram(dto) {
        return this.prisma.workoutProgram.create({
            data: {
                name: dto.name,
                description: dto.description,
                category: dto.category,
                difficulty: dto.difficulty,
                imageUrl: dto.imageUrl,
            },
        });
    }
    async addExerciseToProgram(programId, dto) {
        const program = await this.prisma.workoutProgram.findUnique({
            where: { id: programId },
        });
        if (!program) {
            throw new common_1.NotFoundException(`Workout program with ID ${programId} not found.`);
        }
        return this.prisma.exercise.create({
            data: {
                programId,
                name: dto.name,
                sets: dto.sets,
                reps: dto.reps,
                restTime: dto.restTime,
                notes: dto.notes,
                videoUrl: dto.videoUrl,
                orderIndex: dto.orderIndex,
            },
        });
    }
    async createOrUpdateTemplate(dto) {
        return this.prisma.notificationTemplate.upsert({
            where: { type: dto.type },
            update: {
                title: dto.title,
                body: dto.body,
            },
            create: {
                type: dto.type,
                title: dto.title,
                body: dto.body,
            },
        });
    }
    async getTemplates() {
        return this.prisma.notificationTemplate.findMany();
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map