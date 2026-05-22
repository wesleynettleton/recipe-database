export const DAILY_OPTION_COUNT = 10;
export const DEFAULT_DAILY_OPTIONS_KEY = 'default_daily_options';

export type DailyOptionKey = `option${number}`;

export function dailyOptionKeys(): DailyOptionKey[] {
  return Array.from(
    { length: DAILY_OPTION_COUNT },
    (_, index) => `option${index + 1}` as DailyOptionKey
  );
}

export function buildEmptyDailyOptionIds(): Record<DailyOptionKey, number | null> {
  return Object.fromEntries(
    dailyOptionKeys().map((key) => [key, null])
  ) as Record<DailyOptionKey, number | null>;
}

export function dailyOptionsToRecipeIds(
  dailyOptions: Record<string, { id?: number } | null> | null | undefined
): Record<DailyOptionKey, number | null> {
  const ids = buildEmptyDailyOptionIds();
  if (!dailyOptions) return ids;
  for (const key of dailyOptionKeys()) {
    const recipe = dailyOptions[key];
    ids[key] = recipe?.id ?? null;
  }
  return ids;
}
