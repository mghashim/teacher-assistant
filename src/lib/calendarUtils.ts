import type { DayOfWeek } from "@/types/database";

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: DayOfWeek;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const DAY_INDEX_TO_NAME: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Returns array of 35-42 calendar day items representing the full grid of a given month
 * starting from Monday (European/ISO standard for schools)
 */
export function getMonthCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const todayStr = new Date().toISOString().split("T")[0];

  // Day of week index for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
  // We want Monday to be 0, Sunday to be 6
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset === -1) startOffset = 6; // Sunday becomes index 6

  const days: CalendarDay[] = [];

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = DAY_INDEX_TO_NAME[d.getDay()];
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: d.getDate(),
      dayOfWeek,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = DAY_INDEX_TO_NAME[d.getDay()];
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: day,
      dayOfWeek,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding to complete 35 or 42 grid cells
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = DAY_INDEX_TO_NAME[d.getDay()];
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: i,
      dayOfWeek,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export function formatMonthName(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
