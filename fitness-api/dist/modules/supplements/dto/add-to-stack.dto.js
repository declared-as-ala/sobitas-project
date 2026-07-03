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
exports.AddToStackDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AddToStackDto {
    timing;
    productName;
    servingSize;
    dailyServing;
    totalServings;
    servingsRemaining;
    notes;
    refillReminderEnabled;
    purchaseDate;
}
exports.AddToStackDto = AddToStackDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'morning', description: 'morning, pre_workout, post_workout, bed_time' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddToStackDto.prototype, "timing", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Whey Protein Isolate' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddToStackDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1 scoop (30g)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddToStackDto.prototype, "servingSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1.0, description: 'Servings consumed per day' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], AddToStackDto.prototype, "dailyServing", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 60, description: 'Total servings in the tub' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AddToStackDto.prototype, "totalServings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50.0, description: 'Servings remaining currently' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AddToStackDto.prototype, "servingsRemaining", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Mix with 250ml water', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AddToStackDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, required: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AddToStackDto.prototype, "refillReminderEnabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
    __metadata("design:type", String)
], AddToStackDto.prototype, "purchaseDate", void 0);
//# sourceMappingURL=add-to-stack.dto.js.map