import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { assessmentsRepository } from "@/db/repositories/assessments.repository";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { AssessmentModal } from "./AssessmentModal";
import { GradeEntryModal } from "./GradeEntryModal";
import { formatDate } from "@/lib/utils";
import { calculateAssessmentAverage } from "@/lib/calculations";
import {
  Award,
  Plus,
  Search,
  FileSpreadsheet,
  Edit2,
  Trash2,
  GraduationCap,
  Calendar,
  Users,
} from "lucide-react";
import type { Assessment } from "@/types/database";

export function AssessmentsListTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [deletingAssessment, setDeletingAssessment] = useState<Assessment | null>(null);
  const [markSheetAssessment, setMarkSheetAssessment] = useState<Assessment | null>(null);

  // Live queries
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);
  const assessments = useLiveQuery(() => db.assessments.orderBy("createdAt").reverse().toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const grades = useLiveQuery(() => db.grades.toArray(), []);

  const classMap = useMemo(() => {
    const map = new Map<number, string>();
    classes?.forEach((c) => {
      if (c.id) map.set(c.id, c.name);
    });
    return map;
  }, [classes]);

  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    return assessments.filter((a) => {
      if (selectedClassId !== "all" && a.classId !== selectedClassId) {
        return false;
      }
      if (selectedType !== "all" && a.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const className = (classMap.get(a.classId) || "").toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !className.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [assessments, selectedClassId, selectedType, searchQuery, classMap]);

  const handleDeleteConfirm = async () => {
    if (!deletingAssessment?.id) return;
    await assessmentsRepository.deleteCascade(deletingAssessment.id);
    setDeletingAssessment(null);
  };

  return (
    <div className="space-y-6">
      {/* Action and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Assessments & Mark Sheets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Select any assessment to enter and update student grades in the class mark sheet.
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Create Assessment
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedClassId}
            onChange={(e) =>
              setSelectedClassId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Classes ({assessments?.length ?? 0} assessments)</option>
            {classes?.map((c) => {
              const count = assessments?.filter((a) => a.classId === c.id).length ?? 0;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Types</option>
            <option value="exam">Exam</option>
            <option value="test">Test</option>
            <option value="quiz">Quiz</option>
            <option value="homework">Homework</option>
            <option value="oral">Oral / Speaking</option>
            <option value="practical">Practical</option>
            <option value="project">Project</option>
            <option value="revision">Revision</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Assessments Grid */}
      {filteredAssessments.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No assessments found"
          description={
            searchQuery || selectedClassId !== "all" || selectedType !== "all"
              ? "Try adjusting your search or filters."
              : "Create your first assessment to record marks and monitor class progress."
          }
          actionLabel="Create Assessment"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssessments.map((a) => {
            const enrolledStudents = students?.filter((s) => s.classId === a.classId) ?? [];
            const assessmentGrades = grades?.filter((g) => g.assessmentId === a.id) ?? [];
            const { averageScore, averagePercentage, gradedCount } = calculateAssessmentAverage(assessmentGrades, a);
            const totalCount = enrolledStudents.length;
            const completionPercent = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

            return (
              <Card key={a.id} className="flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Badge variant="secondary" className="uppercase text-[10px] font-semibold">
                        {a.type}
                      </Badge>
                      <CardTitle className="text-base font-bold group-hover:text-primary transition-colors line-clamp-1">
                        {a.title}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingAssessment(a)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Edit Assessment"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingAssessment(a)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                      {classMap.get(a.classId) || "Class"}
                    </span>
                    {a.assessmentDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(a.assessmentDate)}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  {/* Score & Class Average Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Maximum Mark
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {a.maxScore} pts
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Class Average
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {gradedCount > 0 ? (
                          <span className={averagePercentage >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                            {averageScore} ({averagePercentage}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">Not graded</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Marking Completion Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-500" /> Grading Progress:
                      </span>
                      <span className="font-semibold text-foreground">
                        {gradedCount}/{totalCount} Pupils ({completionPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          completionPercent === 100
                            ? "bg-emerald-500"
                            : completionPercent > 0
                            ? "bg-primary"
                            : "bg-transparent"
                        }`}
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t">
                  <Button
                    onClick={() => setMarkSheetAssessment(a)}
                    className="w-full gap-2 shadow-sm font-semibold text-xs h-9 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Enter Marks for All Students</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assessment Modal (Create / Edit) */}
      <AssessmentModal
        isOpen={isCreateModalOpen || editingAssessment !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingAssessment(null);
        }}
        initialData={editingAssessment}
      />

      {/* Grade Entry Spreadsheet Modal */}
      <GradeEntryModal
        isOpen={markSheetAssessment !== null}
        onClose={() => setMarkSheetAssessment(null)}
        assessment={markSheetAssessment}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingAssessment !== null}
        onClose={() => setDeletingAssessment(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${deletingAssessment?.title}"?`}
        message="This will permanently delete this assessment and all grades entered for it across all enrolled students. This action cannot be undone."
        confirmText="Delete Assessment & All Marks"
      />
    </div>
  );
}
