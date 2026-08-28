import { db } from "../database";
import type { AppSetting } from "@/types/database";

export const SETTING_KEYS = {
  THEME: "app_theme",
  LAST_BACKUP_DATE: "last_backup_date",
  DISMISSED_BACKUP_REMINDER_DATE: "dismissed_backup_reminder_date",
  TEACHER_NAME: "teacher_name",
  SCHOOL_NAME: "school_name",
} as const;

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
