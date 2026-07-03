import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AiCoachService } from './ai-coach.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, UserSession } from '../../auth/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('AI Coach')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/ai-coach')
export class AiCoachController {
  constructor(private readonly aiCoachService: AiCoachService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get recent conversation history with the AI Coach' })
  async getChatHistory(@CurrentUser() user: UserSession) {
    return this.aiCoachService.getChatHistory(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Send a message to the AI Coach and get a personalized, multilanguage fitness response' })
  async sendMessage(
    @CurrentUser() user: UserSession,
    @Body() dto: ChatMessageDto,
  ) {
    return this.aiCoachService.handleChatMessage(user.id, dto.message);
  }
}
