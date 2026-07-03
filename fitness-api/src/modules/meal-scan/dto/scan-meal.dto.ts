import { IsNotEmpty, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanMealDto {
  @ApiProperty({ description: 'Base64-encoded JPEG/PNG image data (no data: prefix required)' })
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @ApiProperty({ required: false, example: 'image/jpeg' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({ required: false, example: 'Grilled chicken with rice, looks like ~250g' })
  @IsString()
  @IsOptional()
  @Length(0, 300)
  note?: string;
}
