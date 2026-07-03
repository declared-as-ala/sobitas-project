import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkoutProgramDto {
  @ApiProperty({ example: 'Hypertrophy Upper A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Focus on chest, back, and shoulders upper push/pull' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'muscle_gain', description: 'muscle_gain, fat_loss, gym, home, strength, women' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'intermediate', description: 'beginner, intermediate, advanced' })
  @IsString()
  @IsNotEmpty()
  difficulty: string;

  @ApiProperty({ example: 'https://storage.protein.tn/uploads/programs/upper.jpg', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
