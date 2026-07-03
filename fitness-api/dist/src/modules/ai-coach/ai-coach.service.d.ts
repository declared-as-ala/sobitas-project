import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { ConfigService } from '@nestjs/config';
export declare class AiCoachService {
    private prisma;
    private redis;
    private configService;
    private readonly logger;
    private genAI;
    private readonly disclaimer;
    constructor(prisma: PrismaService, redis: RedisService, configService: ConfigService);
    getChatHistory(userId: number): Promise<{
        createdAt: Date;
        id: number;
        message: string;
        userId: bigint;
        response: string;
        lang: string;
    }[]>;
    handleChatMessage(userId: number, userMessage: string): Promise<{
        message: string;
        response: string;
        lang: string;
    }>;
    private generateFallbackResponse;
}
