import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private client;
    private isConnected;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    incr(key: string): Promise<number | null>;
    expire(key: string, seconds: number): Promise<void>;
    onModuleDestroy(): void;
}
