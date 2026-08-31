import { useState, useEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BackupReminderBanner } from "./BackupReminderBanner";
import { TabletInstallBanner } from "./TabletInstallBanner";
import { QuickActionModal, type QuickActionType } from "./QuickActionModal";
import { seedDatabaseIfEmpty } from "@/db/seed";
import { notificationService } from "@/services/notification.service";
import { StorageGuard } from "./StorageGuard";
import { AutoBackupManager } from "./AutoBackupManager";

// Modals for Quick Actions
import { StudentModal } from "@/features/students/StudentModal";
import { ClassModal } from "@/features/classes/ClassModal";
import { HomeworkModal } from "@/features/students/tabs/HomeworkModal";
import { AssessmentModal } from "@/features/grades/AssessmentModal";
import { DetentionModal } from "@/features/students/tabs/DetentionModal";
import { TaskModal } from "@/features/tasks/TaskModal";
import { EnterMarksPickerModal } from "@/features/grades/EnterMarksPickerModal";
import { GradeEntryModal } from "@/features/grades/GradeEntryModal";
import { BellRing, X } from "lucide-react";
import type { Assessment, TeacherClass } from "@/types/database";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<QuickActionType | null>(null);
  const [selectedGradeEntryAssessment, setSelectedGradeEntryAssessment] = useState<Assessment | null>(null);
  const [activeReminderToast, setActiveReminderToast] = useState<{
    className: string;
    minutesLeft: number;
    room?: string;
  } | null>(null);

  // Live queries for timetable reminders
  const schedules = useLiveQuery(() => db.classSchedules.toArray(), []);
  const classes = useLiveQuery(() => db.classes.toArray(), []);
  const academicYearSetting = useLiveQuery(
    () => db.settings.get("academic_year_config"),
    []
  );

  const classesMap = useMemo(() => {
    const map = new Map<number, TeacherClass>();
    classes?.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [classes]);

  // Ensure mock data or database setup is verified on initial mount
  useEffect(() => {
    seedDatabaseIfEmpty();
  }, []);

  // Background timer checking for lesson reminders every 30 seconds
  useEffect(() => {
    if (!schedules || !classesMap) return;

    const academicConfig = academicYearSetting?.value as
      | { startDate: string; endDate: string; holidays?: Array<{ startDate: string; endDate: string }> }
      | undefined;

    const checkReminders = () => {
      notificationService.checkUpcomingLessons(
        schedules,
        classesMap,
        academicConfig,
        (className, minutesLeft, room) => {
          setActiveReminderToast({ className, minutesLeft, room });
        }
      );
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [schedules, classesMap, academicYearSetting]);

  const handleSelectQuickAction = (action: QuickActionType) => {
    setActiveModal(action);
  };

  const handleAssessmentChosenForMarks = (assessment: Assessment) => {
    setSelectedGradeEntryAssessment(assessment);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-background text-foreground font-sans antialiased overflow-hidden select-text">
      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenQuickAction={() => setQuickActionOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenQuickAction={() => setQuickActionOpen(true)}
        />

        {/* Top Active Lesson Reminder Toast Banner */}
        {activeReminderToast && (
          <div className="bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-sm animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-950 animate-bounce" />
              <span>
                🔔 <strong>Upcoming Lesson:</strong> {activeReminderToast.className}{" "}
                {activeReminderToast.room ? `(${activeReminderToast.room})` : ""}{" "}
                {activeReminderToast.minutesLeft === 0
                  ? "is starting right NOW!"
                  : `starts in ${activeReminderToast.minutesLeft} minute${activeReminderToast.minutesLeft === 1 ? "" : "s"}!`}
              </span>
            </div>

            <button
              onClick={() => setActiveReminderToast(null)}
              className="p-1 rounded hover:bg-amber-600/30 transition-colors"
              title="Dismiss reminder"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <BackupReminderBanner />
        <StorageGuard />
        <AutoBackupManager />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 touch-pan-y overscroll-y-auto">
          <div className="max-w-7xl mx-auto pb-12">
            <TabletInstallBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Quick Action Selection Modal */}
      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        onSelectAction={handleSelectQuickAction}
      />

      {/* Enter Marks Flow from Quick Action */}
      <EnterMarksPickerModal
        isOpen={activeModal === "enter_marks"}
        onClose={() => setActiveModal(null)}
        onSelectAssessment={handleAssessmentChosenForMarks}
      />

      <GradeEntryModal
        isOpen={selectedGradeEntryAssessment !== null}
        onClose={() => setSelectedGradeEntryAssessment(null)}
        assessment={selectedGradeEntryAssessment}
      />

      {/* Direct Modals triggered by Quick Actions */}
      <StudentModal
        isOpen={activeModal === "add_student"}
        onClose={() => setActiveModal(null)}
      />

      <ClassModal
        isOpen={activeModal === "add_class"}
        onClose={() => setActiveModal(null)}
      />

      <HomeworkModal
        isOpen={activeModal === "add_homework"}
        onClose={() => setActiveModal(null)}
      />

      <AssessmentModal
        isOpen={activeModal === "add_assessment"}
        onClose={() => setActiveModal(null)}
      />

      <DetentionModal
        isOpen={activeModal === "add_detention"}
        onClose={() => setActiveModal(null)}
      />

      <TaskModal
        isOpen={activeModal === "add_task"}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
