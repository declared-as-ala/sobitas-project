import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ example: 'I want to gain muscle, how much protein do I need?' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  message: string;
}
