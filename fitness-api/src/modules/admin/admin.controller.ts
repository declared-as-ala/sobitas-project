import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateWorkoutProgramDto } from './dto/create-workout-program.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from './admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin Capabilities')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get fitness ecosystem usage dashboard statistics (Admin only)' })
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Post('workouts')
  @ApiOperation({ summary: 'Create a new workout program (Admin only)' })
  async createProgram(@Body() dto: CreateWorkoutProgramDto) {
    return this.adminService.createWorkoutProgram(dto);
  }

  @Post('workouts/:programId/exercises')
  @ApiOperation({ summary: 'Add an exercise set list to a program (Admin only)' })
  async addExercise(
    @Param('programId') programId: string,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.adminService.addExerciseToProgram(parseInt(programId, 10), dto);
  }

  @Post('notification-templates')
  @ApiOperation({ summary: 'Create or update push notification templates (Admin only)' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.adminService.createOrUpdateTemplate(dto);
  }

  @Get('notification-templates')
  @ApiOperation({ summary: 'Get all notification templates (Admin only)' })
  async getTemplates() {
    return this.adminService.getTemplates();
  }
}
