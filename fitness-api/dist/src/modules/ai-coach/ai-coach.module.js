"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiCoachModule = void 0;
const common_1 = require("@nestjs/common");
const ai_coach_service_1 = require("./ai-coach.service");
const ai_coach_controller_1 = require("./ai-coach.controller");
const prisma_service_1 = require("../../prisma.service");
const redis_service_1 = require("../../redis.service");
const config_1 = require("@nestjs/config");
let AiCoachModule = class AiCoachModule {
};
exports.AiCoachModule = AiCoachModule;
exports.AiCoachModule = AiCoachModule = __decorate([
    (0, common_1.Module)({
        controllers: [ai_coach_controller_1.AiCoachController],
        providers: [ai_coach_service_1.AiCoachService, prisma_service_1.PrismaService, redis_service_1.RedisService, config_1.ConfigService],
        exports: [ai_coach_service_1.AiCoachService],
    })
], AiCoachModule);
//# sourceMappingURL=ai-coach.module.js.map