import type { ClassSchedule, TeacherClass } from "@/types/database";
import { getDayOfWeekFromDate } from "@/lib/calculations";

export interface NotificationSettings {
  enabled: boolean;
  leadMinutes: number; // 5, 10, 15, etc.
  soundEnabled: boolean;
  lastNotifiedSlotKey?: string; // To avoid repeating notifications for same slot on same day
}

const STORAGE_KEY = "teacher_app_notification_settings";

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  leadMinutes: 10,
  soundEnabled: true,
};

/**
 * Play a pleasant two-tone web audio chime without requiring any external audio files
 */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;

    // First Tone (High Note)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second Tone (Higher Harmonious Note)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio autoplay restrictions if user hasn't interacted yet
  }
}

export const notificationService = {
  getSettings(): NotificationSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: NotificationSettings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  },

  isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  },

  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return "denied";
    return Notification.permission;
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch {
      return false;
    }
  },

  /**
   * Display a local web notification + play audio chime
   */
  async sendNotification(title: string, body: string, icon = "/favicon.ico") {
    const settings = this.getSettings();
    if (settings.soundEnabled) {
      playNotificationChime();
    }

    if (this.isSupported() && Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && "showNotification" in reg) {
            await reg.showNotification(title, {
              body,
              icon,
              badge: icon,
              tag: "lesson-reminder",
            });
            return;
          }
        }
        new Notification(title, { body, icon });
      } catch {
        // Fallback or ignore
      }
    }
  },

  /**
   * Checks current time against all scheduled lessons for today
   * and fires notification if a lesson starts in ~leadMinutes
   */
  checkUpcomingLessons(
    schedules: ClassSchedule[],
    classesMap: Map<number, TeacherClass>,
    onReminderFired?: (lessonName: string, minutesLeft: number, room?: string) => void
  ) {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    const now = new Date();
    const todayDay = getDayOfWeekFromDate(now);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMin;

    const todaysSchedules = schedules.filter((s) => s.dayOfWeek === todayDay);

    todaysSchedules.forEach((schedule) => {
      const [startH, startM] = schedule.startTime.split(":").map(Number);
      if (isNaN(startH) || isNaN(startM)) return;

      const scheduleTotalMinutes = startH * 60 + startM;
      const diffMinutes = scheduleTotalMinutes - currentTotalMinutes;

      // Check if within the lead time window (e.g., 0 to leadMinutes)
      if (diffMinutes >= 0 && diffMinutes <= settings.leadMinutes) {
        const todayDateStr = now.toISOString().split("T")[0];
        const slotKey = `${todayDateStr}_${schedule.id}_${schedule.startTime}`;

        if (settings.lastNotifiedSlotKey !== slotKey) {
          settings.lastNotifiedSlotKey = slotKey;
          this.saveSettings(settings);

          const teacherClass = classesMap.get(schedule.classId);
          const className = teacherClass?.name || "Class";
          const roomText = schedule.room ? ` in ${schedule.room}` : "";
          const timeMsg =
            diffMinutes === 0
              ? "is starting right NOW!"
              : `starts in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} (${schedule.startTime})`;

          const title = `🔔 Upcoming Lesson: ${className}`;
          const body = `${className}${roomText} ${timeMsg}`;

          this.sendNotification(title, body);
          onReminderFired?.(className, diffMinutes, schedule.room);
        }
      }
    });
  },
};
