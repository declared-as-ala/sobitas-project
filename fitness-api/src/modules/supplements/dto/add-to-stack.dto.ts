import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToStackDto {
  @ApiProperty({ example: 'morning', description: 'morning, pre_workout, post_workout, bed_time' })
  @IsString()
  @IsNotEmpty()
  timing: string;

  @ApiProperty({ example: 'Whey Protein Isolate' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: '1 scoop (30g)' })
  @IsString()
  @IsNotEmpty()
  servingSize: string;

  @ApiProperty({ example: 1.0, description: 'Servings consumed per day' })
  @IsNumber()
  @IsPositive()
  dailyServing: number;

  @ApiProperty({ example: 60, description: 'Total servings in the tub' })
  @IsNumber()
  @Min(1)
  totalServings: number;

  @ApiProperty({ example: 50.0, description: 'Servings remaining currently' })
  @IsNumber()
  @Min(0)
  servingsRemaining: number;

  @ApiProperty({ example: 'Mix with 250ml water', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  refillReminderEnabled?: boolean;

  @ApiProperty({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  purchaseDate: string;
}
