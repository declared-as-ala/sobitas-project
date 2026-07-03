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
exports.CreateProfileDto = exports.ExperienceLevel = exports.TrainingLocation = exports.FitnessGoal = exports.ActivityLevel = exports.Gender = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
})(Gender || (exports.Gender = Gender = {}));
var ActivityLevel;
(function (ActivityLevel) {
    ActivityLevel["SEDENTARY"] = "sedentary";
    ActivityLevel["LIGHT"] = "light";
    ActivityLevel["MODERATE"] = "moderate";
    ActivityLevel["ACTIVE"] = "active";
    ActivityLevel["VERY_ACTIVE"] = "very_active";
})(ActivityLevel || (exports.ActivityLevel = ActivityLevel = {}));
var FitnessGoal;
(function (FitnessGoal) {
    FitnessGoal["MUSCLE_GAIN"] = "muscle_gain";
    FitnessGoal["WEIGHT_LOSS"] = "weight_loss";
    FitnessGoal["STRENGTH"] = "strength";
    FitnessGoal["MAINTAIN"] = "maintain";
})(FitnessGoal || (exports.FitnessGoal = FitnessGoal = {}));
var TrainingLocation;
(function (TrainingLocation) {
    TrainingLocation["GYM"] = "gym";
    TrainingLocation["HOME"] = "home";
})(TrainingLocation || (exports.TrainingLocation = TrainingLocation = {}));
var ExperienceLevel;
(function (ExperienceLevel) {
    ExperienceLevel["BEGINNER"] = "beginner";
    ExperienceLevel["INTERMEDIATE"] = "intermediate";
    ExperienceLevel["ADVANCED"] = "advanced";
})(ExperienceLevel || (exports.ExperienceLevel = ExperienceLevel = {}));
class CreateProfileDto {
    gender;
    age;
    height;
    weight;
    activityLevel;
    goal;
    trainingLocation;
    experienceLevel;
    dietaryPreference;
    trainingDaysPerWeek;
}
exports.CreateProfileDto = CreateProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: Gender, example: Gender.MALE }),
    (0, class_validator_1.IsEnum)(Gender),
    __metadata("design:type", String)
], CreateProfileDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(12),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateProfileDto.prototype, "age", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 178 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateProfileDto.prototype, "height", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 75 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateProfileDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ActivityLevel, example: ActivityLevel.MODERATE }),
    (0, class_validator_1.IsEnum)(ActivityLevel),
    __metadata("design:type", String)
], CreateProfileDto.prototype, "activityLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: FitnessGoal, example: FitnessGoal.MUSCLE_GAIN }),
    (0, class_validator_1.IsEnum)(FitnessGoal),
    __metadata("design:type", String)
], CreateProfileDto.prototype, "goal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: TrainingLocation, example: TrainingLocation.GYM }),
    (0, class_validator_1.IsEnum)(TrainingLocation),
    __metadata("design:type", String)
], CreateProfileDto.prototype, "trainingLocation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ExperienceLevel, example: ExperienceLevel.BEGINNER }),
    (0, class_validator_1.IsEnum)(ExperienceLevel),
    __metadata("design:type", String)
], CreateProfileDto.prototype, "experienceLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'standard' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProfileDto.prototype, "dietaryPreference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], CreateProfileDto.prototype, "trainingDaysPerWeek", void 0);
//# sourceMappingURL=create-profile.dto.js.map