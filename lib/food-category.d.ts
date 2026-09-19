export type FoodCategoryOption = {
  id: string;
  label: string;
  count: number;
};

export function foodCategoryOf(rawCategory: unknown): string | null;
export function foodCategoryOptions(
  places: { id: string; category?: string }[],
): FoodCategoryOption[];
export function filterByFoodCategory<T extends { category?: string }>(
  places: T[],
  selected: string[],
): T[];
