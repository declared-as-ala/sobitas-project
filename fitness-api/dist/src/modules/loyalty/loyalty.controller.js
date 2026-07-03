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
exports.LoyaltyController = void 0;
const common_1 = require("@nestjs/common");
const loyalty_service_1 = require("./loyalty.service");
const redeem_code_dto_1 = require("./dto/redeem-code.dto");
const auth_guard_1 = require("../../auth/auth.guard");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let LoyaltyController = class LoyaltyController {
    loyaltyService;
    constructor(loyaltyService) {
        this.loyaltyService = loyaltyService;
    }
    async getLoyaltySummary(user) {
        return this.loyaltyService.getLoyaltySummary(user.id);
    }
    async getReferralData(user) {
        return this.loyaltyService.getReferralData(user.id);
    }
    async redeemCode(user, dto) {
        return this.loyaltyService.redeemCode(user.id, dto);
    }
};
exports.LoyaltyController = LoyaltyController;
__decorate([
    (0, common_1.Get)('loyalty'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current points balance, levels progress, and earning logs' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getLoyaltySummary", null);
__decorate([
    (0, common_1.Get)('referrals'),
    (0, swagger_1.ApiOperation)({ summary: 'Get referral code and referred friends statistics' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getReferralData", null);
__decorate([
    (0, common_1.Post)('referrals/redeem'),
    (0, swagger_1.ApiOperation)({ summary: 'Redeem a friend referral code to get bonus points' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession,
        redeem_code_dto_1.RedeemCodeDto]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "redeemCode", null);
exports.LoyaltyController = LoyaltyController = __decorate([
    (0, swagger_1.ApiTags)('Loyalty & Referrals'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('api/v1'),
    __metadata("design:paramtypes", [loyalty_service_1.LoyaltyService])
], LoyaltyController);
//# sourceMappingURL=loyalty.controller.js.map