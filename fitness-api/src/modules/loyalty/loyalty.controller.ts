import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { RedeemCodeDto } from './dto/redeem-code.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Loyalty & Referrals')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('loyalty')
  @ApiOperation({ summary: 'Get current points balance, levels progress, and earning logs' })
  async getLoyaltySummary(@CurrentUser() user: UserSession) {
    return this.loyaltyService.getLoyaltySummary(user.id);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get referral code and referred friends statistics' })
  async getReferralData(@CurrentUser() user: UserSession) {
    return this.loyaltyService.getReferralData(user.id);
  }

  @Post('referrals/redeem')
  @ApiOperation({ summary: 'Redeem a friend referral code to get bonus points' })
  async redeemCode(
    @CurrentUser() user: UserSession,
    @Body() dto: RedeemCodeDto,
  ) {
    return this.loyaltyService.redeemCode(user.id, dto);
  }
}
