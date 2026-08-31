import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export function StorageGuard() {
  const [quotaWarning, setQuotaWarning] = useState<{
    usageMB: number;
    quotaMB: number;
    percentage: number;
  } | null>(null);

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const requestPersistence = async () => {
      if (navigator.storage && navigator.storage.persist) {
        try {
          const isPersisted = await navigator.storage.persisted();
          if (!isPersisted) {
            const granted = await navigator.storage.persist();
            if (granted) {
              console.log("[StorageGuard] Persistent storage granted by browser.");
            } else {
              console.warn("[StorageGuard] Persistent storage denied by browser.");
            }
          } else {
            console.log("[StorageGuard] Storage is already persisted.");
          }
        } catch (error) {
          console.error("[StorageGuard] Error requesting persistence:", error);
        }
      }
    };

    const checkQuota = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage !== undefined && estimate.quota !== undefined) {
            const percentage = (estimate.usage / estimate.quota) * 100;
            // Warn if quota usage is over 80%
            if (percentage > 80 && mounted) {
              setQuotaWarning({
                usageMB: Math.round(estimate.usage / (1024 * 1024)),
                quotaMB: Math.round(estimate.quota / (1024 * 1024)),
                percentage: Math.round(percentage),
              });
            }
          }
        } catch (error) {
          console.error("[StorageGuard] Error estimating quota:", error);
        }
      }
    };

    requestPersistence();
    checkQuota();

    // Re-check quota every 10 minutes
    const interval = setInterval(checkQuota, 10 * 60 * 1000);

    // Global unhandled promise rejection handler to catch Dexie QuotaExceeded errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.name === "QuotaExceededError") {
        console.error("[StorageGuard] Intercepted QuotaExceededError from database!");
        setQuotaWarning({
          usageMB: 0,
          quotaMB: 0,
          percentage: 100, // Fake 100% to trigger the banner urgently
        });
        setIsDismissed(false);
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (!quotaWarning || isDismissed) {
    return null;
  }

  return (
    <div className="bg-red-500/10 border-b border-red-500/30 text-red-900 dark:text-red-200 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>
            <strong>Critical Storage Warning:</strong> Your device is running out of storage space for this application 
            {quotaWarning.percentage < 100 ? ` (${quotaWarning.percentage}% full, ${quotaWarning.usageMB}MB used of ${quotaWarning.quotaMB}MB).` : " (Quota Exceeded Error detected!)."} 
            Please go to Settings and export a backup immediately to prevent data loss.
          </span>
        </div>
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded text-red-700 dark:text-red-300 hover:bg-red-500/20"
            aria-label="Dismiss storage warning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
