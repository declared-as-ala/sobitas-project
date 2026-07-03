import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { AddToStackDto } from './dto/add-to-stack.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Supplements')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class SupplementsController {
  constructor(private readonly supplementsService: SupplementsService) {}

  @Get('supplement-advisor')
  @ApiOperation({ summary: 'Get product recommendations from Protein.tn catalog based on fitness goals' })
  async getRecommendations(@Query('goal') goal: string) {
    return this.supplementsService.getRecommendations(goal);
  }

  @Get('supplement-stacks')
  @ApiOperation({ summary: 'Get user supplement stack planner list' })
  async getStack(@CurrentUser() user: UserSession) {
    return this.supplementsService.getStack(user.id);
  }

  @Post('supplement-stacks')
  @ApiOperation({ summary: 'Add a product to user supplement stack plan' })
  async addToStack(@CurrentUser() user: UserSession, @Body() dto: AddToStackDto) {
    return this.supplementsService.addToStack(user.id, dto);
  }

  @Delete('supplement-stacks/:id')
  @ApiOperation({ summary: 'Remove a product from supplement stack plan' })
  async deleteFromStack(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.supplementsService.deleteFromStack(user.id, parseInt(id, 10));
  }

  @Get('refill-reminders')
  @ApiOperation({ summary: 'Get supplements running low (estimated <= 5 days remaining)' })
  async getRefillReminders(@CurrentUser() user: UserSession) {
    return this.supplementsService.getRefillReminders(user.id);
  }
}
