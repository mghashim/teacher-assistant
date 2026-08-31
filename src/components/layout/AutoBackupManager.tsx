import { useEffect } from "react";
import { backupService } from "@/db/backup/backup.service";
import { settingsRepository } from "@/db/repositories/settings.repository";

export function AutoBackupManager() {
  useEffect(() => {
    let mounted = true;

    const checkAndRunAutoBackup = async () => {
      try {
        const autoBackupEnabled = await settingsRepository.getAutoBackupEnabled();
        if (!autoBackupEnabled) return;

        const reminderInfo = await settingsRepository.checkBackupReminder();
        
        // If it's been 7 or more days, or we've never backed up, trigger an auto-backup
        if (reminderInfo.shouldRemind && mounted) {
          console.log("[AutoBackupManager] 7 days passed. Triggering automated backup...");
          await backupService.exportAndDownloadBackup();
          // The export function automatically records the backup date
        }
      } catch (error) {
        console.error("[AutoBackupManager] Auto-backup failed:", error);
      }
    };

    // Check shortly after app load to avoid blocking initial render
    const initialTimeout = setTimeout(checkAndRunAutoBackup, 5000);

    // Also check periodically if the app is left open for days
    const interval = setInterval(checkAndRunAutoBackup, 12 * 60 * 60 * 1000); // Every 12 hours

    return () => {
      mounted = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return null; // This is a logic-only component
}
