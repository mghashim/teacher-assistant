import { useState, useEffect } from "react";
import { AlertTriangle, Download, X } from "lucide-react";
import { settingsRepository } from "@/db/repositories/settings.repository";
import { backupService } from "@/db/backup/backup.service";

export function BackupReminderBanner() {
  const [reminder, setReminder] = useState<{
    shouldRemind: boolean;
    daysSince: number | null;
    lastBackupDate: string | null;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    settingsRepository.checkBackupReminder().then((res) => {
      setReminder(res);
    });
  }, []);

  if (!reminder || !reminder.shouldRemind || isDismissed) {
    return null;
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await backupService.exportAndDownloadBackup();
      setReminder(null);
    } catch (err) {
      alert("Backup error: " + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Smart Backup Reminder:</strong>{" "}
            {reminder.lastBackupDate
              ? `Last local backup was created ${reminder.daysSince} days ago.`
              : "No offline backup has been created yet."}{" "}
            Keep your local student data safe by exporting a backup.
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            {isExporting ? "Exporting..." : "Backup Now"}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            aria-label="Dismiss backup reminder"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
