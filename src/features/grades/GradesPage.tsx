import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { AssessmentsListTab } from "./AssessmentsListTab";
import { GradesFilterPanel, type GradesFilterState } from "./GradesFilterPanel";
import { AdvancedGradesViewer } from "./AdvancedGradesViewer";
import { AssessmentModal } from "./AssessmentModal";
import {
  Award,
  Sparkles,
  Filter,
  Plus,
  Table,
} from "lucide-react";

const DEFAULT_FILTERS: GradesFilterState = {
  classIds: [],
  studentIds: [],
  assessmentTypes: [],
  assessmentIds: [],
  dateFrom: "",
  dateTo: "",
  columns: {
    score: true,
    percentage: true,
    average: true,
    maxMark: true,
    date: false,
    homeworkApproval: true,
  },
};

export function GradesPage() {
  const [activeTab, setActiveTab] = useState<string>("assessments");
  const [isCreateAssessmentOpen, setIsCreateAssessmentOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [filters, setFilters] = useState<GradesFilterState>(DEFAULT_FILTERS);

  // Live queries
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const assessments = useLiveQuery(() => db.assessments.toArray(), []);
  const grades = useLiveQuery(() => db.grades.toArray(), []);
  const homework = useLiveQuery(() => db.homework.toArray(), []);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Assessments & Academic Gradebook
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage assessment mark sheets, enter student marks, and view cross-class performance matrix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "matrix" && (
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="gap-2 text-xs h-9"
            >
              <Filter className="w-4 h-4" />
              <span>{isFilterOpen ? "Hide Filter Drawer" : "Filter Results"}</span>
            </Button>
          )}

          <Button
            onClick={() => setIsCreateAssessmentOpen(true)}
            className="gap-2 shrink-0 text-xs h-9"
          >
            <Plus className="w-4 h-4" /> New Assessment
          </Button>
        </div>
      </div>

      {/* Main Tabs Header */}
      <Tabs
        tabs={[
          {
            id: "assessments",
            label: "Assessments & Mark Sheets",
            icon: Award,
            badge: assessments?.length ?? 0,
          },
          {
            id: "matrix",
            label: "Advanced Grades Matrix Viewer",
            icon: Table,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Assessments & Mark Sheets */}
      {activeTab === "assessments" && <AssessmentsListTab />}

      {/* Tab 2: Advanced Grades Matrix */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <GradesFilterPanel
            classes={classes ?? []}
            students={students ?? []}
            assessments={assessments ?? []}
            filters={filters}
            onApplyFilters={setFilters}
            onResetFilters={handleResetFilters}
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Grades Matrix & Filtered Results
              </h2>
            </div>

            <AdvancedGradesViewer
              classes={classes ?? []}
              students={students ?? []}
              assessments={assessments ?? []}
              grades={grades ?? []}
              homework={homework ?? []}
              filters={filters}
            />
          </div>
        </div>
      )}

      {/* Create Assessment Modal */}
      <AssessmentModal
        isOpen={isCreateAssessmentOpen}
        onClose={() => setIsCreateAssessmentOpen(false)}
      />
    </div>
  );
}
