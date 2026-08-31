import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  notificationService,
  playNotificationChime,
  type NotificationSettings,
} from "@/services/notification.service";
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface LessonReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LessonReminderModal({ isOpen, onClose }: LessonReminderModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>(notificationService.getSettings());
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationService.getPermissionStatus()
  );
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(notificationService.getSettings());
      setPermission(notificationService.getPermissionStatus());
      setTestSent(false);
    }
  }, [isOpen]);

  const handleToggleEnabled = (enabled: boolean) => {
    const next = { ...settings, enabled };
    setSettings(next);
    notificationService.saveSettings(next);

    // Auto-request browser permission if enabled
    if (enabled && permission === "default") {
      notificationService.requestPermission().then((granted) => {
        setPermission(granted ? "granted" : "denied");
      });
    }
  };

  const handleLeadTimeChange = (mins: number) => {
    const next = { ...settings, leadMinutes: mins };
    setSettings(next);
    notificationService.saveSettings(next);
  };

  const handleToggleSound = (soundEnabled: boolean) => {
    const next = { ...settings, soundEnabled };
    setSettings(next);
    notificationService.saveSettings(next);
    if (soundEnabled) {
      playNotificationChime();
    }
  };

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermission(granted ? "granted" : "denied");
    if (granted) {
      handleToggleEnabled(true);
    }
  };

  const handleSendTestNotification = () => {
    playNotificationChime();
    notificationService.sendNotification(
      "🔔 Lesson Reminder Test",
      "GCSE Arabic starts in 10 minutes in Room 204. Sound & alerts are working properly!"
    );
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lesson Reminders & Notifications"
      description="Get notified automatically before your scheduled class periods begin."
      maxWidth="md"
    >
      <div className="space-y-5 text-xs">
        {/* Permission Status Banner */}
        <div className="p-3.5 rounded-xl bg-muted/40 border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">
                Browser Notification System
              </span>
              <span className="text-[11px] text-muted-foreground">
                {permission === "granted"
                  ? "Notifications are enabled and ready."
                  : permission === "denied"
                  ? "Notifications are blocked in browser settings."
                  : "Browser permission is needed for pop-up alerts."}
              </span>
            </div>
          </div>

          <div>
            {permission === "granted" ? (
              <Badge variant="success" className="gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRequestPermission}
                className="text-[11px] h-7 px-2.5"
              >
                Grant Access
              </Button>
            )}
          </div>
        </div>

        {/* Master Reminder Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
          <div className="space-y-0.5">
            <label className="font-bold text-sm text-foreground flex items-center gap-2">
              <span>Enable Lesson Reminders</span>
              {settings.enabled && (
                <Badge variant="default" className="text-[10px] h-4">
                  Active
                </Badge>
              )}
            </label>
            <p className="text-muted-foreground text-[11px]">
              Automatically checks today's timetable and alerts you before each class period.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Reminder Settings (Lead Time & Sound) */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Reminder Timing (Lead Time):</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mins: 5, label: "5 mins before" },
                { mins: 10, label: "10 mins before" },
                { mins: 15, label: "15 mins before" },
                { mins: 0, label: "At start (0 min)" },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => handleLeadTimeChange(opt.mins)}
                  className={`p-2 rounded-lg border text-center font-medium transition-all cursor-pointer text-[11px] ${
                    settings.leadMinutes === opt.mins
                      ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Alert Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <span className="font-semibold text-foreground block">
                  Audio Alert Chime
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Plays a soft two-tone harmonic chime when a reminder triggers.
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleToggleSound(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Test Alert Button */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
          <div>
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Verify Reminders</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Send an instant test alert with sound.
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSendTestNotification}
            className="gap-1.5 text-xs h-8"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{testSent ? "Alert Sent! 🔔" : "Test Notification"}</span>
          </Button>
        </div>

        {/* Tablet / Offline Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>100% Offline & Tablet Compatible:</strong> Reminders work in the background inside your browser tab or installed PWA on your Samsung Tablet without requiring an internet connection.
          </span>
        </div>

        {/* Modal Close */}
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={onClose} size="sm">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
