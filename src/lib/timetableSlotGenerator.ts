import type { ClassSchedule, DayOfWeek, SchoolHoliday, AcademicYearConfig } from "@/types/database";

export interface TimetableLessonSlot {
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  dayName: string; // e.g. "Tuesday"
  formattedDate: string; // e.g. "Tuesday, 8 Sep 2026"
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:00"
  room?: string;
  scheduleId?: number;
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const DAY_DISPLAY_NAMES: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a safe local Date object
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

/**
 * Check if a given date string falls within any school holidays
 */
export function isDateInHoliday(dateStr: string, holidays?: SchoolHoliday[]): boolean {
  if (!holidays || holidays.length === 0) return false;
  return holidays.some((h) => {
    if (!h.startDate || !h.endDate) return false;
    return dateStr >= h.startDate && dateStr <= h.endDate;
  });
}

/**
 * Find matching class schedule period for a specific date
 */
export function findMatchingTimetableSchedule(
  dateStr: string,
  schedules: ClassSchedule[]
): ClassSchedule | undefined {
  if (!dateStr || !schedules || schedules.length === 0) return undefined;
  const d = parseLocalDate(dateStr);
  const dayOfWeek = DAY_MAP[d.getDay()];
  return schedules.find((s) => s.dayOfWeek.toLowerCase() === dayOfWeek);
}

export interface GenerateSlotsOptions {
  schedules: ClassSchedule[];
  startDate?: string;
  endDate?: string;
  maxCount?: number;
  holidays?: SchoolHoliday[];
  academicYearConfig?: AcademicYearConfig;
}

/**
 * Generates sequential calendar lesson slots matching the class's weekly timetable periods
 */
export function generateTimetableLessonSlots(
  options: GenerateSlotsOptions
): TimetableLessonSlot[] {
  const {
    schedules,
    startDate,
    endDate,
    maxCount = 50,
    holidays = [],
    academicYearConfig,
  } = options;

  if (!schedules || schedules.length === 0) return [];

  // Determine actual starting date
  let startStr = startDate;
  if (!startStr) {
    if (academicYearConfig?.startDate) {
      startStr = academicYearConfig.startDate;
    } else {
      startStr = formatLocalDateString(new Date());
    }
  }

  // Determine end date
  let endStr = endDate;
  if (!endStr && academicYearConfig?.endDate) {
    endStr = academicYearConfig.endDate;
  }

  const allHolidays = holidays.length > 0 ? holidays : academicYearConfig?.holidays || [];

  // Group class schedules by DayOfWeek
  const schedulesByDay = new Map<DayOfWeek, ClassSchedule[]>();
  for (const s of schedules) {
    const key = s.dayOfWeek.toLowerCase() as DayOfWeek;
    if (!schedulesByDay.has(key)) {
      schedulesByDay.set(key, []);
    }
    schedulesByDay.get(key)!.push(s);
  }

  // Sort periods in each day by startTime
  schedulesByDay.forEach((list) => {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const slots: TimetableLessonSlot[] = [];
  const currentDate = parseLocalDate(startStr);
  const maxDaysToScan = 365; // Safety limit
  let scannedDays = 0;

  while (scannedDays < maxDaysToScan && slots.length < maxCount) {
    const dateStr = formatLocalDateString(currentDate);

    // Stop if past end date
    if (endStr && dateStr > endStr) {
      break;
    }

    // Check holidays
    const inHoliday = isDateInHoliday(dateStr, allHolidays);
    if (!inHoliday) {
      const dayOfWeek = DAY_MAP[currentDate.getDay()];
      const matchingSchedules = schedulesByDay.get(dayOfWeek);

      if (matchingSchedules && matchingSchedules.length > 0) {
        for (const sched of matchingSchedules) {
          const displayDate = currentDate.toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          slots.push({
            date: dateStr,
            dayOfWeek,
            dayName: DAY_DISPLAY_NAMES[dayOfWeek],
            formattedDate: displayDate,
            startTime: sched.startTime,
            endTime: sched.endTime,
            room: sched.room,
            scheduleId: sched.id,
          });

          if (slots.length >= maxCount) break;
        }
      }
    }

    // Advance by 1 day
    currentDate.setDate(currentDate.getDate() + 1);
    scannedDays++;
  }

  return slots;
}

/**
 * Finds the very next available timetable slot for this class strictly after a reference date
 */
export function getNextAvailableTimetableSlot(
  schedules: ClassSchedule[],
  afterDateStr?: string,
  academicYearConfig?: AcademicYearConfig
): TimetableLessonSlot | null {
  if (!schedules || schedules.length === 0) return null;

  let startFromStr = formatLocalDateString(new Date());

  if (afterDateStr) {
    // Start scanning the day immediately following afterDateStr
    const ref = parseLocalDate(afterDateStr);
    ref.setDate(ref.getDate() + 1);
    startFromStr = formatLocalDateString(ref);
  } else if (academicYearConfig?.startDate) {
    const todayStr = formatLocalDateString(new Date());
    startFromStr = todayStr < academicYearConfig.startDate ? academicYearConfig.startDate : todayStr;
  }

  const generated = generateTimetableLessonSlots({
    schedules,
    startDate: startFromStr,
    maxCount: 1,
    academicYearConfig,
  });

  return generated.length > 0 ? generated[0] : null;
}
