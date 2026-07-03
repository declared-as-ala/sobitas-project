export declare enum MealType {
    BREAKFAST = "Breakfast",
    LUNCH = "Lunch",
    DINNER = "Dinner",
    SNACK = "Snack",
    SHAKE = "Protein shake"
}
export declare class LogProteinDto {
    mealType: string;
    proteinAmount: number;
    description?: string;
    date: string;
}
