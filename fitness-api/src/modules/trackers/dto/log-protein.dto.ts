import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MealType {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  DINNER = 'Dinner',
  SNACK = 'Snack',
  SHAKE = 'Protein shake',
}

export class LogProteinDto {
  @ApiProperty({ enum: MealType, example: MealType.BREAKFAST })
  @IsEnum(MealType)
  mealType: string;

  @ApiProperty({ example: 35, description: 'Amount of protein in grams' })
  @IsInt()
  @IsPositive()
  proteinAmount: number;

  @ApiProperty({ example: 'Oatmeal with whey', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  date: string;
}
