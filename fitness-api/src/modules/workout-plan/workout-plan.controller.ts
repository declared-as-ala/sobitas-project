import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WorkoutPlanService } from './workout-plan.service';
import { GenerateWorkoutPlanDto } from './dto/generate-workout-plan.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Workout Plan')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/workout-plan')
export class WorkoutPlanController {
  constructor(private readonly workoutPlanService: WorkoutPlanService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a personalized multi-week workout plan based on profile and weekly availability' })
  async generate(@CurrentUser() user: UserSession, @Body() dto: GenerateWorkoutPlanDto) {
    return this.workoutPlanService.generatePlan(user.id, dto.daysPerWeek);
  }
}
