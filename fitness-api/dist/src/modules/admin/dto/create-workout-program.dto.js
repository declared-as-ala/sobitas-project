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
exports.CreateWorkoutProgramDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateWorkoutProgramDto {
    name;
    description;
    category;
    difficulty;
    imageUrl;
}
exports.CreateWorkoutProgramDto = CreateWorkoutProgramDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Hypertrophy Upper A' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateWorkoutProgramDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Focus on chest, back, and shoulders upper push/pull' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateWorkoutProgramDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'muscle_gain', description: 'muscle_gain, fat_loss, gym, home, strength, women' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateWorkoutProgramDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'intermediate', description: 'beginner, intermediate, advanced' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateWorkoutProgramDto.prototype, "difficulty", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://storage.protein.tn/uploads/programs/upper.jpg', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWorkoutProgramDto.prototype, "imageUrl", void 0);
//# sourceMappingURL=create-workout-program.dto.js.map