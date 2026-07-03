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
exports.LogProteinDto = exports.MealType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var MealType;
(function (MealType) {
    MealType["BREAKFAST"] = "Breakfast";
    MealType["LUNCH"] = "Lunch";
    MealType["DINNER"] = "Dinner";
    MealType["SNACK"] = "Snack";
    MealType["SHAKE"] = "Protein shake";
})(MealType || (exports.MealType = MealType = {}));
class LogProteinDto {
    mealType;
    proteinAmount;
    description;
    date;
}
exports.LogProteinDto = LogProteinDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: MealType, example: MealType.BREAKFAST }),
    (0, class_validator_1.IsEnum)(MealType),
    __metadata("design:type", String)
], LogProteinDto.prototype, "mealType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 35, description: 'Amount of protein in grams' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], LogProteinDto.prototype, "proteinAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Oatmeal with whey', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LogProteinDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-03', description: 'Date format YYYY-MM-DD' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
    __metadata("design:type", String)
], LogProteinDto.prototype, "date", void 0);
//# sourceMappingURL=log-protein.dto.js.map