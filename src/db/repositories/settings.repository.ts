import { db } from "../database";
import type { AppSetting, AcademicYearConfig } from "@/types/database";

export const SETTING_KEYS = {
  THEME: "app_theme",
  LAST_BACKUP_DATE: "last_backup_date",
  DISMISSED_BACKUP_REMINDER_DATE: "dismissed_backup_reminder_date",
  TEACHER_NAME: "teacher_name",
  SCHOOL_NAME: "school_name",
  ACADEMIC_YEAR: "academic_year_config",
} as const;

export const DEFAULT_ACADEMIC_YEAR: AcademicYearConfig = {
  name: "2026-2027 Academic Year",
  startDate: "2026-09-01",
  endDate: "2027-07-20",
  holidays: [
    {
      id: "autumn-half-term",
      name: "Autumn Half Term",
      startDate: "2026-10-26",
      endDate: "2026-10-30",
      type: "break",
    },
    {
      id: "winter-break",
      name: "Winter / Christmas Holiday",
      startDate: "2026-12-21",
      endDate: "2027-01-01",
      type: "holiday",
    },
    {
      id: "spring-half-term",
      name: "Spring Half Term",
      startDate: "2027-02-15",
      endDate: "2027-02-19",
      type: "break",
    },
    {
      id: "spring-easter-break",
      name: "Spring / Easter Holiday",
      startDate: "2027-03-29",
      endDate: "2027-04-09",
      type: "holiday",
    },
    {
      id: "summer-half-term",
      name: "Summer Half Term",
      startDate: "2027-05-31",
      endDate: "2027-06-04",
      type: "break",
    },
    {
      id: "summer-break",
      name: "Summer Holidays",
      startDate: "2027-07-21",
      endDate: "2027-08-31",
      type: "holiday",
    },
  ],
};

export const settingsRepository = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await db.settings.get(key);
    if (!setting || setting.value === undefined) {
      return defaultValue;
    }
    return setting.value as T;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await db.settings.put({
      key,
      value,
    } as AppSetting);
  },

  async getTheme(): Promise<"light" | "dark" | "system"> {
    return this.get<"light" | "dark" | "system">(SETTING_KEYS.THEME, "system");
  },

  async setTheme(theme: "light" | "dark" | "system"): Promise<void> {
    return this.set(SETTING_KEYS.THEME, theme);
  },

  async getLastBackupDate(): Promise<string | null> {
    return this.get<string | null>(SETTING_KEYS.LAST_BACKUP_DATE, null);
  },

  async recordBackupNow(): Promise<void> {
    const now = new Date().toISOString();
    await this.set(SETTING_KEYS.LAST_BACKUP_DATE, now);
  },

  async getAcademicYearConfig(): Promise<AcademicYearConfig> {
    return this.get<AcademicYearConfig>(
      SETTING_KEYS.ACADEMIC_YEAR,
      DEFAULT_ACADEMIC_YEAR
    );
  },

  async setAcademicYearConfig(config: AcademicYearConfig): Promise<void> {
    return this.set(SETTING_KEYS.ACADEMIC_YEAR, config);
  },

  /**
   * Smart 7-day backup reminder logic
   */
  async checkBackupReminder(): Promise<{
    shouldRemind: boolean;
    daysSince: number | null;
    lastBackupDate: string | null;
  }> {
    const lastBackupStr = await this.getLastBackupDate();
    if (!lastBackupStr) {
      return { shouldRemind: true, daysSince: null, lastBackupDate: null };
    }

    const lastBackup = new Date(lastBackupStr);
    const now = new Date();
    const diffMs = now.getTime() - lastBackup.getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      shouldRemind: daysSince >= 7,
      daysSince,
      lastBackupDate: lastBackupStr,
    };
  },
};
