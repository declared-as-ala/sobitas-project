import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MealScanService } from './meal-scan.service';
import { ScanMealDto } from './dto/scan-meal.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Meal Scan')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/meal-scan')
export class MealScanController {
  constructor(private readonly mealScanService: MealScanService) {}

  @Post()
  @ApiOperation({ summary: 'Analyze a meal photo and estimate calories/protein/carbs/fat' })
  async scanMeal(@CurrentUser() user: UserSession, @Body() dto: ScanMealDto) {
    return this.mealScanService.scanMeal(user.id, dto.imageBase64, dto.mimeType || 'image/jpeg', dto.note);
  }
}
