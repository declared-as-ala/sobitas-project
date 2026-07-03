import { IsInt, IsNotEmpty, IsPositive, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogWaterDto {
  @ApiProperty({ example: 250, description: 'Amount of water in ml' })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  date: string;
}
