import { useMemo } from "react";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Filter, RotateCcw, X } from "lucide-react";
import type { TeacherClass, Student, Assessment, AssessmentType } from "@/types/database";

export interface GradesFilterState {
  classIds: number[];
  studentIds: number[];
  assessmentTypes: AssessmentType[];
  assessmentIds: number[];
  dateFrom: string;
  dateTo: string;
  columns: {
    score: boolean;
    percentage: boolean;
    average: boolean;
    maxMark: boolean;
    date: boolean;
    homeworkApproval: boolean;
  };
}

const ALL_ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string }> = [
  { value: "exam", label: "Exam" },
  { value: "mock", label: "Mock Exam" },
  { value: "quiz", label: "Quiz / Test" },
  { value: "speaking", label: "Speaking" },
  { value: "writing", label: "Writing" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "assignment", label: "Assignment" },
  { value: "practical", label: "Practical" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

interface GradesFilterPanelProps {
  classes: TeacherClass[];
  students: Student[];
  assessments: Assessment[];
  filters: GradesFilterState;
  onApplyFilters: (filters: GradesFilterState) => void;
  onResetFilters: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function GradesFilterPanel({
  classes,
  students,
  assessments,
  filters,
  onApplyFilters,
  onResetFilters,
  isOpen,
  onClose,
}: GradesFilterPanelProps) {
  // Available classes options
  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: c.id!,
        label: c.name,
      })),
    [classes]
  );

  // Available students (optionally narrowed by selected classIds)
  const studentOptions = useMemo(() => {
    const pool =
      filters.classIds.length > 0
        ? students.filter((s) => filters.classIds.includes(s.classId))
        : students;

    return pool.map((s) => ({
      value: s.id!,
      label: `${s.lastName}, ${s.firstName}`,
    }));
  }, [students, filters.classIds]);

  // Available assessments (optionally narrowed by selected classIds or types)
  const assessmentOptions = useMemo(() => {
    let pool = assessments;
    if (filters.classIds.length > 0) {
      pool = pool.filter((a) => filters.classIds.includes(a.classId));
    }
    if (filters.assessmentTypes.length > 0) {
      pool = pool.filter((a) => filters.assessmentTypes.includes(a.type));
    }

    return pool.map((a) => ({
      value: a.id!,
      label: a.title,
    }));
  }, [assessments, filters.classIds, filters.assessmentTypes]);

  const handleClassChange = (selected: Array<string | number>) => {
    onApplyFilters({
      ...filters,
      classIds: selected.map(Number),
      // Clean up student IDs that no longer belong to selected classes
      studentIds: filters.studentIds.filter((sId) => {
        const student = students.find((s) => s.id === sId);
        return student && (selected.length === 0 || selected.includes(student.classId));
      }),
    });
  };

  const handleStudentChange = (selected: Array<string | number>) => {
    onApplyFilters({
      ...filters,
      studentIds: selected.map(Number),
    });
  };

  const handleTypeChange = (selected: Array<string | number>) => {
    onApplyFilters({
      ...filters,
      assessmentTypes: selected as AssessmentType[],
    });
  };

  const handleAssessmentChange = (selected: Array<string | number>) => {
    onApplyFilters({
      ...filters,
      assessmentIds: selected.map(Number),
    });
  };

  const handleColumnToggle = (colKey: keyof GradesFilterState["columns"], val: boolean) => {
    onApplyFilters({
      ...filters,
      columns: {
        ...filters.columns,
        [colKey]: val,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="p-5 rounded-2xl bg-card border shadow-sm space-y-5 animate-in fade-in">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm tracking-tight">Grades Table Filter Controls</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </Button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Close filter panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Class Selection */}
        <MultiSelect
          label="1. Filter Classes"
          placeholder="All Classes"
          options={classOptions}
          selectedValues={filters.classIds}
          onChange={handleClassChange}
        />

        {/* Student Selection */}
        <MultiSelect
          label="2. Filter Students"
          placeholder="All Students"
          options={studentOptions}
          selectedValues={filters.studentIds}
          onChange={handleStudentChange}
        />

        {/* Assessment Type Selection */}
        <MultiSelect
          label="3. Assessment Types"
          placeholder="All Assessment Types"
          options={ALL_ASSESSMENT_TYPES}
          selectedValues={filters.assessmentTypes}
          onChange={handleTypeChange}
        />

        {/* Specific Assessment Selection */}
        <MultiSelect
          label="4. Specific Assessments"
          placeholder="All Assessments"
          options={assessmentOptions}
          selectedValues={filters.assessmentIds}
          onChange={handleAssessmentChange}
        />
      </div>

      {/* Date Filter Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <Input
          label="Date From (Optional)"
          type="date"
          value={filters.dateFrom}
          onChange={(e) =>
            onApplyFilters({ ...filters, dateFrom: e.target.value })
          }
        />
        <Input
          label="Date To (Optional)"
          type="date"
          value={filters.dateTo}
          onChange={(e) =>
            onApplyFilters({ ...filters, dateTo: e.target.value })
          }
        />
      </div>

      {/* Display Options / Visible Column Checkboxes */}
      <div className="pt-3 border-t space-y-2.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Custom Display Columns
        </span>

        <div className="flex flex-wrap gap-4 sm:gap-6 pt-1">
          <Checkbox
            label="Raw Score (e.g. 28/30)"
            checked={filters.columns.score}
            onChange={(val) => handleColumnToggle("score", val)}
          />
          <Checkbox
            label="Percentage %"
            checked={filters.columns.percentage}
            onChange={(val) => handleColumnToggle("percentage", val)}
          />
          <Checkbox
            label="Student Average"
            checked={filters.columns.average}
            onChange={(val) => handleColumnToggle("average", val)}
          />
          <Checkbox
            label="Maximum Mark"
            checked={filters.columns.maxMark}
            onChange={(val) => handleColumnToggle("maxMark", val)}
          />
          <Checkbox
            label="Assessment Date"
            checked={filters.columns.date}
            onChange={(val) => handleColumnToggle("date", val)}
          />
          <Checkbox
            label="Homework Approval Status"
            checked={filters.columns.homeworkApproval}
            onChange={(val) => handleColumnToggle("homeworkApproval", val)}
          />
        </div>
      </div>
    </div>
  );
}
