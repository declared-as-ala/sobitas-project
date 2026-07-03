export declare enum Gender {
    MALE = "male",
    FEMALE = "female"
}
export declare enum ActivityLevel {
    SEDENTARY = "sedentary",
    LIGHT = "light",
    MODERATE = "moderate",
    ACTIVE = "active",
    VERY_ACTIVE = "very_active"
}
export declare enum FitnessGoal {
    MUSCLE_GAIN = "muscle_gain",
    WEIGHT_LOSS = "weight_loss",
    STRENGTH = "strength",
    MAINTAIN = "maintain"
}
export declare enum TrainingLocation {
    GYM = "gym",
    HOME = "home"
}
export declare enum ExperienceLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
}
export declare class CreateProfileDto {
    gender: string;
    age: number;
    height: number;
    weight: number;
    activityLevel: string;
    goal: string;
    trainingLocation: string;
    experienceLevel: string;
    dietaryPreference: string;
    trainingDaysPerWeek: number;
}
