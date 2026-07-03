import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemCodeDto {
  @ApiProperty({ example: 'REF-1234', description: 'Referral code to redeem' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  referralCode: string;
}
