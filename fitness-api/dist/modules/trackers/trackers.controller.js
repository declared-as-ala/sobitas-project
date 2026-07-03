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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackersController = void 0;
const common_1 = require("@nestjs/common");
const trackers_service_1 = require("./trackers.service");
const log_water_dto_1 = require("./dto/log-water.dto");
const log_protein_dto_1 = require("./dto/log-protein.dto");
const log_body_progress_dto_1 = require("./dto/log-body-progress.dto");
const auth_guard_1 = require("../../auth/auth.guard");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let TrackersController = class TrackersController {
    trackersService;
    constructor(trackersService) {
        this.trackersService = trackersService;
    }
    async logWater(user, dto) {
        return this.trackersService.logWater(user.id, dto);
    }
    async getWaterLogs(user, date) {
        return this.trackersService.getWaterLogs(user.id, date);
    }
    async logProtein(user, dto) {
        return this.trackersService.logProtein(user.id, dto);
    }
    async getProteinLogs(user, date) {
        return this.trackersService.getProteinLogs(user.id, date);
    }
    async logBodyProgress(user, dto) {
        return this.trackersService.logBodyProgress(user.id, dto);
    }
    async getBodyProgress(user) {
        return this.trackersService.getBodyProgressLogs(user.id);
    }
};
exports.TrackersController = TrackersController;
__decorate([
    (0, common_1.Post)('water-tracker'),
    (0, swagger_1.ApiOperation)({ summary: 'Log daily water consumption' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, log_water_dto_1.LogWaterDto]),
    __metadata("design:returntype", Promise)
], TrackersController.prototype, "logWater", null);
__decorate([
    (0, common_1.Get)('water-tracker/:date'),
    (0, swagger_1.ApiOperation)({ summary: 'Get water logs for a specific date' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, String]),
    __metadata("design:returntype", Promise)
], TrackersController.prototype, "getWaterLogs", null);
__decorate([
    (0, common_1.Post)('protein-tracker'),
    (0, swagger_1.ApiOperation)({ summary: 'Log protein intake' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, log_protein_dto_1.LogProteinDto]),
    __metadata("design:returntype", Promise)
], TrackersController.prototype, "logProtein", null);
__decorate([
    (0, common_1.Get)('protein-tracker/:date'),
    (0, swagger_1.ApiOperation)({ summary: 'Get logged protein targets for a specific date' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, String]),
    __metadata("design:returntype", Promise)
], TrackersController.prototype, "getProteinLogs", null);
__decorate([
    (0, common_1.Post)('body-progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Record body measurements and weight logs' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession,
        log_body_progress_dto_1.LogBodyProgressDto]),
    __metadata("design:returntype", Promise)
], TrackersController.prototype, "logBodyProgress", null);
__decorate([
    (0, common_1.Get)('body-progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Get body progress history and comparison' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession]),
    __metadata("design:returntype", Promise)
], TrackersController.prototype, "getBodyProgress", null);
exports.TrackersController = TrackersController = __decorate([
    (0, swagger_1.ApiTags)('Trackers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('api/v1'),
    __metadata("design:paramtypes", [trackers_service_1.TrackersService])
], TrackersController);
//# sourceMappingURL=trackers.controller.js.map