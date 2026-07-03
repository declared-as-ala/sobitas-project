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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const create_workout_program_dto_1 = require("./dto/create-workout-program.dto");
const create_exercise_dto_1 = require("./dto/create-exercise.dto");
const create_template_dto_1 = require("./dto/create-template.dto");
const auth_guard_1 = require("../../auth/auth.guard");
const admin_guard_1 = require("./admin.guard");
const swagger_1 = require("@nestjs/swagger");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getStats() {
        return this.adminService.getDashboardStats();
    }
    async createProgram(dto) {
        return this.adminService.createWorkoutProgram(dto);
    }
    async addExercise(programId, dto) {
        return this.adminService.addExerciseToProgram(parseInt(programId, 10), dto);
    }
    async createTemplate(dto) {
        return this.adminService.createOrUpdateTemplate(dto);
    }
    async getTemplates() {
        return this.adminService.getTemplates();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get fitness ecosystem usage dashboard statistics (Admin only)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('workouts'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new workout program (Admin only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_workout_program_dto_1.CreateWorkoutProgramDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createProgram", null);
__decorate([
    (0, common_1.Post)('workouts/:programId/exercises'),
    (0, swagger_1.ApiOperation)({ summary: 'Add an exercise set list to a program (Admin only)' }),
    __param(0, (0, common_1.Param)('programId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_exercise_dto_1.CreateExerciseDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "addExercise", null);
__decorate([
    (0, common_1.Post)('notification-templates'),
    (0, swagger_1.ApiOperation)({ summary: 'Create or update push notification templates (Admin only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_template_dto_1.CreateTemplateDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Get)('notification-templates'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all notification templates (Admin only)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTemplates", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin Capabilities'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, admin_guard_1.AdminGuard),
    (0, common_1.Controller)('api/v1/admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map