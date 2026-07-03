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
exports.LogBodyProgressDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class LogBodyProgressDto {
    weight;
    chest;
    waist;
    arms;
    legs;
    bodyFatPercentage;
    progressPhotoUrl;
    date;
}
exports.LogBodyProgressDto = LogBodyProgressDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 75.4, description: 'Weight in kg' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], LogBodyProgressDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 98.5, required: false, description: 'Chest size in cm' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LogBodyProgressDto.prototype, "chest", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 82.0, required: false, description: 'Waist size in cm' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LogBodyProgressDto.prototype, "waist", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 38.2, required: false, description: 'Arms size in cm' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LogBodyProgressDto.prototype, "arms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 55.4, required: false, description: 'Legs size in cm' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LogBodyProgressDto.prototype, "legs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 14.5, required: false, description: 'Body fat percentage' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LogBodyProgressDto.prototype, "bodyFatPercentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://storage.protein.tn/uploads/progress/img.jpg', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LogBodyProgressDto.prototype, "progressPhotoUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
    __metadata("design:type", String)
], LogBodyProgressDto.prototype, "date", void 0);
//# sourceMappingURL=log-body-progress.dto.js.map