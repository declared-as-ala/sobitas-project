import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecommendationRuleDto {
  @ApiProperty({ example: 'muscle_gain', description: 'muscle_gain, weight_loss, recovery, strength, beginner, health' })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({ example: 'Protéines,Créatines', description: 'Comma-separated categories to recommend' })
  @IsString()
  @IsNotEmpty()
  recommendedCategories: string;

  @ApiProperty({ example: 'whey,isolate', required: false, description: 'Comma-separated tags to filter' })
  @IsString()
  @IsOptional()
  recommendedTags?: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}
