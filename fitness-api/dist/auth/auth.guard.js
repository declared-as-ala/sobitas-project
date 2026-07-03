"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const redis_service_1 = require("../redis.service");
const crypto = __importStar(require("crypto"));
let AuthGuard = class AuthGuard {
    prisma;
    redis;
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Authorization header missing or invalid');
        }
        const tokenString = authHeader.split(' ')[1];
        if (!tokenString) {
            throw new common_1.UnauthorizedException('Bearer token missing');
        }
        try {
            const cacheKey = `auth:session:${crypto.createHash('sha256').update(tokenString).digest('hex')}`;
            const cachedUser = await this.redis.get(cacheKey);
            if (cachedUser) {
                request.user = JSON.parse(cachedUser);
                return true;
            }
            let tokenId = null;
            let tokenValue = tokenString;
            if (tokenString.includes('|')) {
                const parts = tokenString.split('|');
                const idStr = parts[0];
                const valStr = parts[1];
                if (idStr && valStr) {
                    tokenId = parseInt(idStr, 10);
                    tokenValue = valStr;
                }
            }
            const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
            let tokenRecord = null;
            if (tokenId !== null && !isNaN(tokenId)) {
                tokenRecord = await this.prisma.personalAccessToken.findUnique({
                    where: { id: BigInt(tokenId) },
                });
            }
            else {
                tokenRecord = await this.prisma.personalAccessToken.findFirst({
                    where: { token: tokenHash },
                });
            }
            if (!tokenRecord || tokenRecord.token !== tokenHash) {
                throw new common_1.UnauthorizedException('Invalid or expired token');
            }
            const user = await this.prisma.user.findUnique({
                where: { id: tokenRecord.tokenableId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    roleId: true,
                },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User account not found');
            }
            const formattedUser = {
                id: Number(user.id),
                name: user.name,
                email: user.email,
                phone: user.phone,
                roleId: user.roleId ? Number(user.roleId) : null,
            };
            await this.redis.set(cacheKey, JSON.stringify(formattedUser), 300);
            request.user = formattedUser;
            return true;
        }
        catch (e) {
            if (e instanceof common_1.UnauthorizedException) {
                throw e;
            }
            throw new common_1.UnauthorizedException('Authentication failed');
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map