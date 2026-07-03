import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis reconnection failed. Falling back to DB-only mode.');
            this.isConnected = false;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.error(`Redis connection error: ${err.message}`);
      });
    } catch (e) {
      this.isConnected = false;
      this.logger.error('Failed to initialize Redis client', e);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (e) {
      this.logger.warn(`Failed to set Redis key ${key}: ${e.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch {}
  }

  async incr(key: string): Promise<number | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      return await this.client.incr(key);
    } catch {
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.expire(key, seconds);
    } catch {}
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
