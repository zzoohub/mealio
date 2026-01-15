/**
 * Date utility functions for the diary domain
 */

/**
 * Get all days of the week for a given date
 * @param date - The date to get the week for
 * @returns Array of 7 dates (Sunday to Saturday)
 */
export function getWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(date);
  const dayOfWeek = current.getDay();

  // Start from Sunday (0)
  current.setDate(current.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format time to localized string
 * @param date - The date to format
 * @param locale - The locale to use (default: "ko-KR")
 */
export function formatTime(date: Date, locale: string = "ko-KR"): string {
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get emoji for meal type
 */
export function getMealTypeEmoji(mealType: string): string {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "sunrise";
    case "lunch":
      return "sunny";
    case "dinner":
      return "moon";
    case "snack":
      return "nutrition";
    default:
      return "restaurant";
  }
}

/**
 * Get Korean label for meal type
 */
export function getMealTypeLabel(mealType: string): string {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "breakfast";
    case "lunch":
      return "lunch";
    case "dinner":
      return "dinner";
    case "snack":
      return "snack";
    default:
      return "meal";
  }
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Korean day names (Sunday to Saturday)
 */
export const DAY_NAMES_KO = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Get localized day name
 */
export function getDayName(index: number, locale: string = "en"): string {
  if (locale === "ko") {
    const koDays = ["일", "월", "화", "수", "목", "금", "토"];
    return koDays[index] ?? "";
  }
  return DAY_NAMES_KO[index] ?? "";
}
