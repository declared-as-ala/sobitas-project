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
exports.SupplementsController = void 0;
const common_1 = require("@nestjs/common");
const supplements_service_1 = require("./supplements.service");
const add_to_stack_dto_1 = require("./dto/add-to-stack.dto");
const auth_guard_1 = require("../../auth/auth.guard");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let SupplementsController = class SupplementsController {
    supplementsService;
    constructor(supplementsService) {
        this.supplementsService = supplementsService;
    }
    async getRecommendations(goal) {
        return this.supplementsService.getRecommendations(goal);
    }
    async getStack(user) {
        return this.supplementsService.getStack(user.id);
    }
    async addToStack(user, dto) {
        return this.supplementsService.addToStack(user.id, dto);
    }
    async deleteFromStack(user, id) {
        return this.supplementsService.deleteFromStack(user.id, parseInt(id, 10));
    }
    async getRefillReminders(user) {
        return this.supplementsService.getRefillReminders(user.id);
    }
};
exports.SupplementsController = SupplementsController;
__decorate([
    (0, common_1.Get)('supplement-advisor'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product recommendations from Protein.tn catalog based on fitness goals' }),
    __param(0, (0, common_1.Query)('goal')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SupplementsController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Get)('supplement-stacks'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user supplement stack planner list' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession]),
    __metadata("design:returntype", Promise)
], SupplementsController.prototype, "getStack", null);
__decorate([
    (0, common_1.Post)('supplement-stacks'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a product to user supplement stack plan' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, add_to_stack_dto_1.AddToStackDto]),
    __metadata("design:returntype", Promise)
], SupplementsController.prototype, "addToStack", null);
__decorate([
    (0, common_1.Delete)('supplement-stacks/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a product from supplement stack plan' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, String]),
    __metadata("design:returntype", Promise)
], SupplementsController.prototype, "deleteFromStack", null);
__decorate([
    (0, common_1.Get)('refill-reminders'),
    (0, swagger_1.ApiOperation)({ summary: 'Get supplements running low (estimated <= 5 days remaining)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession]),
    __metadata("design:returntype", Promise)
], SupplementsController.prototype, "getRefillReminders", null);
exports.SupplementsController = SupplementsController = __decorate([
    (0, swagger_1.ApiTags)('Supplements'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('api/v1'),
    __metadata("design:paramtypes", [supplements_service_1.SupplementsService])
], SupplementsController);
//# sourceMappingURL=supplements.controller.js.map