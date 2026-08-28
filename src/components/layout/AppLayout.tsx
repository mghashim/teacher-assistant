import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BackupReminderBanner } from "./BackupReminderBanner";
import { TabletInstallBanner } from "./TabletInstallBanner";
import { QuickActionModal, type QuickActionType } from "./QuickActionModal";
import { seedDatabaseIfEmpty } from "@/db/seed";

// Modals for Quick Actions
import { StudentModal } from "@/features/students/StudentModal";
import { ClassModal } from "@/features/classes/ClassModal";
import { HomeworkModal } from "@/features/students/tabs/HomeworkModal";
import { AssessmentModal } from "@/features/grades/AssessmentModal";
import { DetentionModal } from "@/features/students/tabs/DetentionModal";
import { TaskModal } from "@/features/tasks/TaskModal";
import { EnterMarksPickerModal } from "@/features/grades/EnterMarksPickerModal";
import { GradeEntryModal } from "@/features/grades/GradeEntryModal";
import type { Assessment } from "@/types/database";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<QuickActionType | null>(null);
  const [selectedGradeEntryAssessment, setSelectedGradeEntryAssessment] = useState<Assessment | null>(null);

  // Ensure mock data or database setup is verified on initial mount
  useEffect(() => {
    seedDatabaseIfEmpty();
  }, []);

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

        <BackupReminderBanner />

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
