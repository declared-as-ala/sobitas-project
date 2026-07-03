import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Workouts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get('workouts')
  @ApiOperation({ summary: 'Get workout programs matching category' })
  async getPrograms(@Query('category') category?: string) {
    return this.workoutsService.getPrograms(category);
  }

  @Get('workouts/:id')
  @ApiOperation({ summary: 'Get program details with exercise list' })
  async getProgramById(@Param('id') id: string) {
    return this.workoutsService.getProgramById(parseInt(id, 10));
  }

  @Post('workout-logs')
  @ApiOperation({ summary: 'Log sets and repetitions completed' })
  async logWorkout(@CurrentUser() user: UserSession, @Body() dto: LogWorkoutDto) {
    return this.workoutsService.logWorkout(user.id, dto);
  }

  @Get('workout-logs')
  @ApiOperation({ summary: 'Get user workout logs history' })
  async getWorkoutLogs(
    @CurrentUser() user: UserSession,
    @Query('date') date?: string,
  ) {
    return this.workoutsService.getWorkoutLogs(user.id, date);
  }
}
