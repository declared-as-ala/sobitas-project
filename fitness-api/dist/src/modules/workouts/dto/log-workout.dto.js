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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogWorkoutDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class LogWorkoutDto {
    exerciseId;
    weightUsed;
    repsCompleted;
    setsCompleted;
    notes;
    date;
}
exports.LogWorkoutDto = LogWorkoutDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'ID of the exercise' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], LogWorkoutDto.prototype, "exerciseId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45.5, description: 'Weight used in kg' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], LogWorkoutDto.prototype, "weightUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Completed repetitions' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], LogWorkoutDto.prototype, "repsCompleted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: 'Current set index completed' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], LogWorkoutDto.prototype, "setsCompleted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Felt strong, good squeeze', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LogWorkoutDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
    __metadata("design:type", String)
], LogWorkoutDto.prototype, "date", void 0);
//# sourceMappingURL=log-workout.dto.js.map