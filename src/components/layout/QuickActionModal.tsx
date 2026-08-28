import {
  Users,
  GraduationCap,
  FileCheck,
  Award,
  AlertTriangle,
  CheckSquare,
  FileSpreadsheet,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export type QuickActionType =
  | "enter_marks"
  | "add_student"
  | "add_class"
  | "add_homework"
  | "add_assessment"
  | "add_detention"
  | "add_task";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickActionType) => void;
}

export function QuickActionModal({
  isOpen,
  onClose,
  onSelectAction,
}: QuickActionModalProps) {
  const actions: Array<{
    id: QuickActionType;
    title: string;
    description: string;
    icon: typeof Users;
    color: string;
    highlight?: boolean;
  }> = [
    {
      id: "enter_marks",
      title: "Enter Marks",
      description: "Open class mark sheet to enter grades for all enrolled students",
      icon: FileSpreadsheet,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
      highlight: true,
    },
    {
      id: "add_assessment",
      title: "Add Assessment",
      description: "Create an exam, quiz, oral, or practical assessment",
      icon: Award,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/50",
    },
    {
      id: "add_student",
      title: "Add Student",
      description: "Enroll a new student and assign them to a class",
      icon: Users,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
    },
    {
      id: "add_class",
      title: "Add Class",
      description: "Create a new classroom group and define its timetable",
      icon: GraduationCap,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50",
    },
    {
      id: "add_homework",
      title: "Add Homework",
      description: "Assign or record homework marks for a student",
      icon: FileCheck,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-950/50",
    },
    {
      id: "add_detention",
      title: "Add Detention",
      description: "Log a break, lunch, or 8:00 am detention record",
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/50",
    },
    {
      id: "add_task",
      title: "Add Task / Reminder",
      description: "Create a teacher to-do item linked to a class or student",
      icon: CheckSquare,
      color: "text-violet-600 bg-violet-50 dark:bg-violet-950/50",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Actions"
      description="Select an action to quickly record data without navigating away."
      maxWidth="md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:bg-accent/60 transition-all text-left group cursor-pointer ${
                act.highlight
                  ? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-500"
                  : "border-border"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${act.color} shrink-0 transition-transform group-hover:scale-105`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>{act.title}</span>
                  {act.highlight && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Popular
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {act.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
