import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateProfileDto, FitnessGoal, ActivityLevel, Gender } from './dto/create-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!profile) {
      throw new NotFoundException('Fitness profile not found. Please complete onboarding.');
    }

    return profile;
  }

  async createOrUpdateProfile(userId: number, dto: CreateProfileDto) {
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

  private calculateTargets(dto: CreateProfileDto) {
    // 1. Calculate BMR (Mifflin-St Jeor)
    let bmr = 10 * dto.weight + 6.25 * dto.height - 5 * dto.age;
    if (dto.gender === Gender.MALE) {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    // 2. Calculate TDEE
    let activityMultiplier = 1.2;
    switch (dto.activityLevel) {
      case ActivityLevel.SEDENTARY:
        activityMultiplier = 1.2;
        break;
      case ActivityLevel.LIGHT:
        activityMultiplier = 1.375;
        break;
      case ActivityLevel.MODERATE:
        activityMultiplier = 1.55;
        break;
      case ActivityLevel.ACTIVE:
        activityMultiplier = 1.725;
        break;
      case ActivityLevel.VERY_ACTIVE:
        activityMultiplier = 1.9;
        break;
    }
    const tdee = Math.round(bmr * activityMultiplier);

    // 3. Set Targets based on Goal
    let calorieTarget = tdee;
    let proteinTarget = 2.0 * dto.weight; // default: 2.0g per kg
    let fatPct = 0.25; // default: 25% of calories
    let waterTarget = 3000; // default: 3000ml

    switch (dto.goal) {
      case FitnessGoal.MUSCLE_GAIN:
        calorieTarget = tdee + 300;
        proteinTarget = 2.2 * dto.weight; // higher protein for building
        fatPct = 0.25;
        waterTarget = 3500;
        break;
      case FitnessGoal.WEIGHT_LOSS:
        calorieTarget = tdee - 500;
        proteinTarget = 2.4 * dto.weight; // preserve lean mass
        fatPct = 0.20; // lower fat
        waterTarget = 3000;
        break;
      case FitnessGoal.STRENGTH:
        calorieTarget = tdee;
        proteinTarget = 2.0 * dto.weight;
        fatPct = 0.25;
        waterTarget = 3200;
        break;
      case FitnessGoal.MAINTAIN:
        calorieTarget = tdee;
        proteinTarget = 1.8 * dto.weight;
        fatPct = 0.25;
        waterTarget = 2500;
        break;
    }

    // Protein: 4 kcal/g
    const proteinKcal = proteinTarget * 4;
    // Fat: 9 kcal/g
    const fatKcal = calorieTarget * fatPct;
    const fatTarget = fatKcal / 9;
    // Carbs: 4 kcal/g (remainder)
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
}
