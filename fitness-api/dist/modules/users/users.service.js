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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const create_profile_dto_1 = require("./dto/create-profile.dto");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const profile = await this.prisma.fitnessProfile.findUnique({
            where: { userId: BigInt(userId) },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Fitness profile not found. Please complete onboarding.');
        }
        return profile;
    }
    async createOrUpdateProfile(userId, dto) {
        const targets = this.calculateTargets(dto);
        return this.prisma.fitnessProfile.upsert({
            where: { userId: BigInt(userId) },
            update: {
                gender: dto.gender,
                age: dto.age,
                height: dto.height,
                weight: dto.weight,
                activityLevel: dto.activityLevel,
                goal: dto.goal,
                trainingLocation: dto.trainingLocation,
                experienceLevel: dto.experienceLevel,
                dietaryPreference: dto.dietaryPreference,
                trainingDaysPerWeek: dto.trainingDaysPerWeek,
                ...targets,
            },
            create: {
                userId: BigInt(userId),
                gender: dto.gender,
                age: dto.age,
                height: dto.height,
                weight: dto.weight,
                activityLevel: dto.activityLevel,
                goal: dto.goal,
                trainingLocation: dto.trainingLocation,
                experienceLevel: dto.experienceLevel,
                dietaryPreference: dto.dietaryPreference,
                trainingDaysPerWeek: dto.trainingDaysPerWeek,
                ...targets,
            },
        });
    }
    calculateTargets(dto) {
        let bmr = 10 * dto.weight + 6.25 * dto.height - 5 * dto.age;
        if (dto.gender === create_profile_dto_1.Gender.MALE) {
            bmr += 5;
        }
        else {
            bmr -= 161;
        }
        let activityMultiplier = 1.2;
        switch (dto.activityLevel) {
            case create_profile_dto_1.ActivityLevel.SEDENTARY:
                activityMultiplier = 1.2;
                break;
            case create_profile_dto_1.ActivityLevel.LIGHT:
                activityMultiplier = 1.375;
                break;
            case create_profile_dto_1.ActivityLevel.MODERATE:
                activityMultiplier = 1.55;
                break;
            case create_profile_dto_1.ActivityLevel.ACTIVE:
                activityMultiplier = 1.725;
                break;
            case create_profile_dto_1.ActivityLevel.VERY_ACTIVE:
                activityMultiplier = 1.9;
                break;
        }
        const tdee = Math.round(bmr * activityMultiplier);
        let calorieTarget = tdee;
        let proteinTarget = 2.0 * dto.weight;
        let fatPct = 0.25;
        let waterTarget = 3000;
        switch (dto.goal) {
            case create_profile_dto_1.FitnessGoal.MUSCLE_GAIN:
                calorieTarget = tdee + 300;
                proteinTarget = 2.2 * dto.weight;
                fatPct = 0.25;
                waterTarget = 3500;
                break;
            case create_profile_dto_1.FitnessGoal.WEIGHT_LOSS:
                calorieTarget = tdee - 500;
                proteinTarget = 2.4 * dto.weight;
                fatPct = 0.20;
                waterTarget = 3000;
                break;
            case create_profile_dto_1.FitnessGoal.STRENGTH:
                calorieTarget = tdee;
                proteinTarget = 2.0 * dto.weight;
                fatPct = 0.25;
                waterTarget = 3200;
                break;
            case create_profile_dto_1.FitnessGoal.MAINTAIN:
                calorieTarget = tdee;
                proteinTarget = 1.8 * dto.weight;
                fatPct = 0.25;
                waterTarget = 2500;
                break;
        }
        const proteinKcal = proteinTarget * 4;
        const fatKcal = calorieTarget * fatPct;
        const fatTarget = fatKcal / 9;
        const carbsKcal = calorieTarget - (proteinKcal + fatKcal);
        const carbsTarget = Math.max(0, carbsKcal / 4);
        return {
            dailyCalorieTarget: Math.round(calorieTarget),
            dailyProteinTarget: Math.round(proteinTarget),
            dailyFatTarget: Math.round(fatTarget),
            dailyCarbsTarget: Math.round(carbsTarget),
            dailyWaterTarget: Math.round(waterTarget),
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map