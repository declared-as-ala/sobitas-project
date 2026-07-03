"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyModule = void 0;
const common_1 = require("@nestjs/common");
const loyalty_service_1 = require("./loyalty.service");
const loyalty_controller_1 = require("./loyalty.controller");
const prisma_service_1 = require("../../prisma.service");
const redis_service_1 = require("../../redis.service");
let LoyaltyModule = class LoyaltyModule {
};
exports.LoyaltyModule = LoyaltyModule;
exports.LoyaltyModule = LoyaltyModule = __decorate([
    (0, common_1.Module)({
        controllers: [loyalty_controller_1.LoyaltyController],
        providers: [loyalty_service_1.LoyaltyService, prisma_service_1.PrismaService, redis_service_1.RedisService],
        exports: [loyalty_service_1.LoyaltyService],
    })
], LoyaltyModule);
//# sourceMappingURL=loyalty.module.js.map