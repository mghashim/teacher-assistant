import { Menu, Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenQuickAction: () => void;
}

export function Header({ onOpenSidebar, onOpenQuickAction }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Sun className="w-4 h-4 text-amber-500" />;
    if (theme === "dark") return <Moon className="w-4 h-4 text-indigo-400" />;
    return <Laptop className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick action button (tablet/desktop) */}
        <button
          type="button"
          onClick={onOpenQuickAction}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-all cursor-pointer"
        >
          <span>+ Quick Action</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={cycleTheme}
          title={`Current Theme: ${theme.toUpperCase()} (Click to toggle)`}
          className="p-2 rounded-lg border border-input bg-background hover:bg-accent text-foreground transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {getThemeIcon()}
        </button>
      </div>
    </header>
  );
}
