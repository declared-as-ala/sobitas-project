import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogWorkoutDto {
  @ApiProperty({ example: 1, description: 'ID of the exercise' })
  @IsInt()
  @IsPositive()
  exerciseId: number;

  @ApiProperty({ example: 45.5, description: 'Weight used in kg' })
  @IsNumber()
  @IsPositive()
  weightUsed: number;

  @ApiProperty({ example: 10, description: 'Completed repetitions' })
  @IsInt()
  @IsPositive()
  repsCompleted: number;

  @ApiProperty({ example: 3, description: 'Current set index completed' })
  @IsInt()
  @IsPositive()
  setsCompleted: number;

  @ApiProperty({ example: 'Felt strong, good squeeze', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  date: string;
}
