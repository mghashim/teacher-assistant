import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Tablet,
  Download,
  WifiOff,
  X,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function TabletInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed on tablet)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        "To install on your Samsung Tablet:\n\n1. In Samsung Internet or Chrome, tap the 3-dot Menu (⋮) or Share icon\n2. Select 'Add to Home screen' or 'Install App'\n3. Launch from your home screen or apps menu for 100% full-screen offline use!"
      );
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error("Install prompt error:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  if (isStandalone) {
    return null; // Already installed and running as native tablet app
  }

  if (isDismissed) {
    return null;
  }

  return (
    <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 dark:border-indigo-800/60 shadow-xs relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shrink-0 shadow-md shadow-primary/20">
            <Tablet className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                Install on Samsung Galaxy Tab (Offline PWA)
              </span>
              <Badge variant="success" className="text-[10px] gap-1">
                <WifiOff className="w-3 h-3" /> 100% Offline Ready
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Install this app directly onto your tablet's home screen or Samsung DeX for a full-screen, serverless experience with zero internet needed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </Button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
