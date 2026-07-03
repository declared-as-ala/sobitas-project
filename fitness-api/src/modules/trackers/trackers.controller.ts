import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TrackersService } from './trackers.service';
import { LogWaterDto } from './dto/log-water.dto';
import { LogProteinDto } from './dto/log-protein.dto';
import { LogBodyProgressDto } from './dto/log-body-progress.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Trackers')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class TrackersController {
  constructor(private readonly trackersService: TrackersService) {}

  // ── Water Tracker ────────────────────────────────────────────────

  @Post('water-tracker')
  @ApiOperation({ summary: 'Log daily water consumption' })
  async logWater(@CurrentUser() user: UserSession, @Body() dto: LogWaterDto) {
    return this.trackersService.logWater(user.id, dto);
  }

  @Get('water-tracker/:date')
  @ApiOperation({ summary: 'Get water logs for a specific date' })
  async getWaterLogs(@CurrentUser() user: UserSession, @Param('date') date: string) {
    return this.trackersService.getWaterLogs(user.id, date);
  }

  // ── Protein Tracker ──────────────────────────────────────────────

  @Post('protein-tracker')
  @ApiOperation({ summary: 'Log protein intake' })
  async logProtein(@CurrentUser() user: UserSession, @Body() dto: LogProteinDto) {
    return this.trackersService.logProtein(user.id, dto);
  }

  @Get('protein-tracker/:date')
  @ApiOperation({ summary: 'Get logged protein targets for a specific date' })
  async getProteinLogs(@CurrentUser() user: UserSession, @Param('date') date: string) {
    return this.trackersService.getProteinLogs(user.id, date);
  }

  // ── Body Progress ────────────────────────────────────────────────

  @Post('body-progress')
  @ApiOperation({ summary: 'Record body measurements and weight logs' })
  async logBodyProgress(
    @CurrentUser() user: UserSession,
    @Body() dto: LogBodyProgressDto,
  ) {
    return this.trackersService.logBodyProgress(user.id, dto);
  }

  @Get('body-progress')
  @ApiOperation({ summary: 'Get body progress history and comparison' })
  async getBodyProgress(@CurrentUser() user: UserSession) {
    return this.trackersService.getBodyProgressLogs(user.id);
  }
}
