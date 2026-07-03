import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'refill', description: 'refill, workout, water, protein, loyalty' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Refill your supplement stock! ⏳' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your [product] is running low. Reorder now from Protein.tn and keep crushing your goals!' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
