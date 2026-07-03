import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExerciseDto {
  @ApiProperty({ example: 'Incline Dumbbell Press' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @IsPositive()
  sets: number;

  @ApiProperty({ example: '8-12' })
  @IsString()
  @IsNotEmpty()
  reps: string;

  @ApiProperty({ example: 90, description: 'Rest time in seconds' })
  @IsInt()
  @Min(0)
  restTime: number;

  @ApiProperty({ example: 'Keep elbows at 45 degrees, squeeze chest at top', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'https://youtube.com/watch?v=exercise', required: false })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ example: 1, description: 'Display order index' })
  @IsInt()
  @Min(0)
  orderIndex: number;
}
