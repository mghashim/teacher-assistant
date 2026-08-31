import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  Users,
  Award,
  CheckSquare,
  Settings,
  Sparkles,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "My Timetable", href: "/timetable", icon: Calendar },
  { name: "Classes", href: "/classes", icon: GraduationCap },
  { name: "Students", href: "/students", icon: Users },
  { name: "Assessments & Grades", href: "/grades", icon: Award },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "User Manual", href: "/manual", icon: BookOpen },
  { name: "Settings & Backup", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickAction: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenQuickAction }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-card border-r border-border transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-foreground">
                Teacher Assistant
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Local-First Workspace</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action button */}
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              onOpenQuickAction();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all border border-primary/20 cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
            <span>+ Quick Action</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-accent-foreground"
                      )}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Offline Badge Footer */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="p-3 rounded-lg bg-muted/50 border border-border/80 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-foreground block">
                100% Offline
              </span>
              <span className="text-muted-foreground text-[10px]">
                Data saved in local IndexedDB.
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
