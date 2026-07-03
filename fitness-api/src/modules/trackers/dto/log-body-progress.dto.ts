import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogBodyProgressDto {
  @ApiProperty({ example: 75.4, description: 'Weight in kg' })
  @IsNumber()
  @IsPositive()
  weight: number;

  @ApiProperty({ example: 98.5, required: false, description: 'Chest size in cm' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  chest?: number;

  @ApiProperty({ example: 82.0, required: false, description: 'Waist size in cm' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  waist?: number;

  @ApiProperty({ example: 38.2, required: false, description: 'Arms size in cm' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  arms?: number;

  @ApiProperty({ example: 55.4, required: false, description: 'Legs size in cm' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  legs?: number;

  @ApiProperty({ example: 14.5, required: false, description: 'Body fat percentage' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  bodyFatPercentage?: number;

  @ApiProperty({ example: 'https://storage.protein.tn/uploads/progress/img.jpg', required: false })
  @IsString()
  @IsOptional()
  progressPhotoUrl?: string;

  @ApiProperty({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  date: string;
}
