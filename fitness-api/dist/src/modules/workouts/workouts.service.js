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
exports.WorkoutsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let WorkoutsService = class WorkoutsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPrograms(category) {
        return this.prisma.workoutProgram.findMany({
            where: category ? { category } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    async getProgramById(id) {
        const program = await this.prisma.workoutProgram.findUnique({
            where: { id },
            include: {
                exercises: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });
        if (!program) {
            throw new common_1.NotFoundException(`Workout program with ID ${id} not found.`);
        }
        return program;
    }
    async logWorkout(userId, dto) {
        const exercise = await this.prisma.exercise.findUnique({
            where: { id: dto.exerciseId },
        });
        if (!exercise) {
            throw new common_1.NotFoundException(`Exercise with ID ${dto.exerciseId} not found.`);
        }
        const log = await this.prisma.workoutLog.create({
            data: {
                userId: BigInt(userId),
                exerciseId: dto.exerciseId,
                weightUsed: dto.weightUsed,
                repsCompleted: dto.repsCompleted,
                setsCompleted: dto.setsCompleted,
                notes: dto.notes,
                date: dto.date,
            },
        });
        const dailyLogsCount = await this.prisma.workoutLog.count({
            where: {
                userId: BigInt(userId),
                date: dto.date,
            },
        });
        if (dailyLogsCount <= 2) {
            await this.prisma.loyaltyPointTransaction.create({
                data: {
                    userId: BigInt(userId),
                    points: 20,
                    source: 'workout',
                    notes: `Loyalty points awarded for workout exercise log on ${dto.date}`,
                },
            });
        }
        return log;
    }
    async getWorkoutLogs(userId, date) {
        return this.prisma.workoutLog.findMany({
            where: {
                userId: BigInt(userId),
                ...(date ? { date } : {}),
            },
            include: {
                exercise: {
                    select: {
                        name: true,
                        sets: true,
                        reps: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.WorkoutsService = WorkoutsService;
exports.WorkoutsService = WorkoutsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkoutsService);
//# sourceMappingURL=workouts.service.js.map