import { IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateWorkoutPlanDto {
  @ApiProperty({ enum: [3, 4, 5], description: 'Training days available per week' })
  @Type(() => Number)
  @IsIn([3, 4, 5])
  daysPerWeek: number;
}
