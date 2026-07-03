"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    configService;
    logger = new common_1.Logger(RedisService_1.name);
    client = null;
    isConnected = false;
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const host = this.configService.get('REDIS_HOST', '127.0.0.1');
        const port = this.configService.get('REDIS_PORT', 6379);
        const password = this.configService.get('REDIS_PASSWORD', '');
        try {
            this.client = new ioredis_1.default({
                host,
                port,
                password: password || undefined,
                maxRetriesPerRequest: 1,
                retryStrategy: (times) => {
                    if (times > 3) {
                        this.logger.warn('Redis reconnection failed. Falling back to DB-only mode.');
                        this.isConnected = false;
                        return null;
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
        }
        catch (e) {
            this.isConnected = false;
            this.logger.error('Failed to initialize Redis client', e);
        }
    }
    async get(key) {
        if (!this.isConnected || !this.client)
            return null;
        try {
            return await this.client.get(key);
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        if (!this.isConnected || !this.client)
            return;
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (e) {
            this.logger.warn(`Failed to set Redis key ${key}: ${e.message}`);
        }
    }
    async del(key) {
        if (!this.isConnected || !this.client)
            return;
        try {
            await this.client.del(key);
        }
        catch { }
    }
    async incr(key) {
        if (!this.isConnected || !this.client)
            return null;
        try {
            return await this.client.incr(key);
        }
        catch {
            return null;
        }
    }
    async expire(key, seconds) {
        if (!this.isConnected || !this.client)
            return;
        try {
            await this.client.expire(key, seconds);
        }
        catch { }
    }
    onModuleDestroy() {
        if (this.client) {
            this.client.disconnect();
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map