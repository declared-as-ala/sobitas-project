import { AiCoachService } from './ai-coach.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { UserSession } from '../../auth/current-user.decorator';
export declare class AiCoachController {
    private readonly aiCoachService;
    constructor(aiCoachService: AiCoachService);
    getChatHistory(user: UserSession): Promise<{
        createdAt: Date;
        id: number;
        message: string;
        userId: bigint;
        response: string;
        lang: string;
    }[]>;
    sendMessage(user: UserSession, dto: ChatMessageDto): Promise<{
        message: string;
        response: string;
        lang: string;
    }>;
}
