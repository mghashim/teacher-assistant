import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Search, GraduationCap, ChevronRight } from "lucide-react";
import type { Assessment } from "@/types/database";

interface EnterMarksPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAssessment: (assessment: Assessment) => void;
}

export function EnterMarksPickerModal({
  isOpen,
  onClose,
  onSelectAssessment,
}: EnterMarksPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const className = (classMap.get(a.classId) || "").toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !className.includes(q) && !a.type.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [assessments, selectedClassId, searchQuery, classMap]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Assessment to Enter Marks"
      description="Choose an assessment to open the class mark sheet and enter student grades."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search assessment or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <select
            value={selectedClassId}
            onChange={(e) =>
              setSelectedClassId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Classes ({assessments?.length ?? 0} assessments)</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assessments List */}
        <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
          {filteredAssessments.length === 0 ? (
            <div className="p-8 text-center border rounded-xl border-dashed bg-muted/20 text-xs text-muted-foreground">
              No assessments found matching your criteria.
            </div>
          ) : (
            filteredAssessments.map((assessment) => {
              const enrolledStudents =
                students?.filter(
                  (s) =>
                    (Array.isArray(s.classIds) && s.classIds.includes(assessment.classId)) ||
                    s.classId === assessment.classId
                ) ?? [];
              const gradedCount = grades?.filter((g) => g.assessmentId === assessment.id).length ?? 0;
              const isFullyGraded = enrolledStudents.length > 0 && gradedCount >= enrolledStudents.length;

              return (
                <button
                  key={assessment.id}
                  type="button"
                  onClick={() => {
                    onSelectAssessment(assessment);
                    onClose();
                  }}
                  className="w-full p-3.5 rounded-xl border bg-card hover:bg-accent/60 hover:border-primary/50 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {assessment.title}
                      </span>
                      <Badge variant="secondary" className="uppercase text-[9px] shrink-0">
                        {assessment.type}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                        {classMap.get(assessment.classId)}
                      </span>
                      <span>• Max Mark: {assessment.maxScore}</span>
                      {assessment.assessmentDate && <span>• {formatDate(assessment.assessmentDate)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isFullyGraded
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {gradedCount}/{enrolledStudents.length} Graded
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
