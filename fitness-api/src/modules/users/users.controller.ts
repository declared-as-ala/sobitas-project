import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Fitness Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/fitness-profile')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user fitness profile and computed targets' })
  async getProfile(@CurrentUser() user: UserSession) {
    return this.usersService.getProfile(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update user onboarding fitness profile' })
  async createOrUpdateProfile(
    @CurrentUser() user: UserSession,
    @Body() dto: CreateProfileDto,
  ) {
    return this.usersService.createOrUpdateProfile(user.id, dto);
  }
}
