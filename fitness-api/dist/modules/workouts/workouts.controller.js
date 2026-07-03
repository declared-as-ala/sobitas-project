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
exports.WorkoutsController = void 0;
const common_1 = require("@nestjs/common");
const workouts_service_1 = require("./workouts.service");
const log_workout_dto_1 = require("./dto/log-workout.dto");
const auth_guard_1 = require("../../auth/auth.guard");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let WorkoutsController = class WorkoutsController {
    workoutsService;
    constructor(workoutsService) {
        this.workoutsService = workoutsService;
    }
    async getPrograms(category) {
        return this.workoutsService.getPrograms(category);
    }
    async getProgramById(id) {
        return this.workoutsService.getProgramById(parseInt(id, 10));
    }
    async logWorkout(user, dto) {
        return this.workoutsService.logWorkout(user.id, dto);
    }
    async getWorkoutLogs(user, date) {
        return this.workoutsService.getWorkoutLogs(user.id, date);
    }
};
exports.WorkoutsController = WorkoutsController;
__decorate([
    (0, common_1.Get)('workouts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get workout programs matching category' }),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkoutsController.prototype, "getPrograms", null);
__decorate([
    (0, common_1.Get)('workouts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get program details with exercise list' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkoutsController.prototype, "getProgramById", null);
__decorate([
    (0, common_1.Post)('workout-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Log sets and repetitions completed' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, log_workout_dto_1.LogWorkoutDto]),
    __metadata("design:returntype", Promise)
], WorkoutsController.prototype, "logWorkout", null);
__decorate([
    (0, common_1.Get)('workout-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user workout logs history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserSession, String]),
    __metadata("design:returntype", Promise)
], WorkoutsController.prototype, "getWorkoutLogs", null);
exports.WorkoutsController = WorkoutsController = __decorate([
    (0, swagger_1.ApiTags)('Workouts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('api/v1'),
    __metadata("design:paramtypes", [workouts_service_1.WorkoutsService])
], WorkoutsController);
//# sourceMappingURL=workouts.controller.js.map