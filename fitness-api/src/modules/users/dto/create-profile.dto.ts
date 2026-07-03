import {
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
  VERY_ACTIVE = 'very_active',
}

export enum FitnessGoal {
  MUSCLE_GAIN = 'muscle_gain',
  WEIGHT_LOSS = 'weight_loss',
  STRENGTH = 'strength',
  MAINTAIN = 'maintain',
}

export enum TrainingLocation {
  GYM = 'gym',
  HOME = 'home',
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class CreateProfileDto {
  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  gender: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(12)
  @Max(100)
  age: number;

  @ApiProperty({ example: 178 })
  @IsNumber()
  @IsPositive()
  height: number; // in cm

  @ApiProperty({ example: 75 })
  @IsNumber()
  @IsPositive()
  weight: number; // in kg

  @ApiProperty({ enum: ActivityLevel, example: ActivityLevel.MODERATE })
  @IsEnum(ActivityLevel)
  activityLevel: string;

  @ApiProperty({ enum: FitnessGoal, example: FitnessGoal.MUSCLE_GAIN })
  @IsEnum(FitnessGoal)
  goal: string;

  @ApiProperty({ enum: TrainingLocation, example: TrainingLocation.GYM })
  @IsEnum(TrainingLocation)
  trainingLocation: string;

  @ApiProperty({ enum: ExperienceLevel, example: ExperienceLevel.BEGINNER })
  @IsEnum(ExperienceLevel)
  experienceLevel: string;

  @ApiProperty({ example: 'standard' })
  @IsString()
  dietaryPreference: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(7)
  trainingDaysPerWeek: number;
}
