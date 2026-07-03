"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackersModule = void 0;
const common_1 = require("@nestjs/common");
const trackers_service_1 = require("./trackers.service");
const trackers_controller_1 = require("./trackers.controller");
const prisma_service_1 = require("../../prisma.service");
const redis_service_1 = require("../../redis.service");
let TrackersModule = class TrackersModule {
};
exports.TrackersModule = TrackersModule;
exports.TrackersModule = TrackersModule = __decorate([
    (0, common_1.Module)({
        controllers: [trackers_controller_1.TrackersController],
        providers: [trackers_service_1.TrackersService, prisma_service_1.PrismaService, redis_service_1.RedisService],
        exports: [trackers_service_1.TrackersService],
    })
], TrackersModule);
//# sourceMappingURL=trackers.module.js.map