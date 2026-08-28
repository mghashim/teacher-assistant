import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { gradesRepository } from "@/db/repositories/grades.repository";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { calculatePercentage } from "@/lib/calculations";
import { CheckCircle2, AlertCircle, Sparkles, RotateCcw } from "lucide-react";
import type { Assessment, Student, Grade } from "@/types/database";

interface GradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
}

interface StudentGradeInput {
  score: string;
  feedback: string;
}

export function GradeEntryModal({
  isOpen,
  onClose,
  assessment,
}: GradeEntryModalProps) {
  const [gradeInputs, setGradeInputs] = useState<Record<number, StudentGradeInput>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all students in this assessment's class
  const students = useLiveQuery<Student[]>(
    () =>
      assessment?.classId
        ? db.students.where("classId").equals(assessment.classId).sortBy("lastName")
        : Promise.resolve([]),
    [assessment?.classId]
  );

  // Fetch existing grades for this assessment
  const existingGrades = useLiveQuery<Grade[]>(
    () =>
      assessment?.id
        ? db.grades.where("assessmentId").equals(assessment.id).toArray()
        : Promise.resolve([]),
    [assessment?.id]
  );

  // Pre-fill existing grades
  useEffect(() => {
    if (students && existingGrades) {
      const state: Record<number, StudentGradeInput> = {};
      students.forEach((student) => {
        const found = existingGrades.find((g) => g.studentId === student.id);
        state[student.id!] = {
          score: found ? String(found.score) : "",
          feedback: found?.feedback || "",
        };
      });
      setGradeInputs(state);
      setGeneralError(null);
    }
  }, [students, existingGrades, isOpen]);

  // Real-time validation errors for all students
  const rowErrors = useMemo(() => {
    if (!assessment) return {};
    const errors: Record<number, string> = {};

    Object.entries(gradeInputs).forEach(([studentIdStr, data]) => {
      const sId = Number(studentIdStr);
      const val = data.score.trim();

      if (val === "") {
        // Empty is allowed (ungraded / absent)
        return;
      }

      const num = Number(val);
      if (isNaN(num)) {
        errors[sId] = "Must be a valid number";
      } else if (num < 0) {
        errors[sId] = "Mark cannot be negative";
      } else if (num > assessment.maxScore) {
        errors[sId] = `Cannot exceed maximum mark of ${assessment.maxScore}`;
      }
    });

    return errors;
  }, [gradeInputs, assessment]);

  const hasValidationErrors = Object.keys(rowErrors).length > 0;

  if (!assessment) return null;

  const handleScoreChange = (studentId: number, val: string) => {
    setGradeInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: val,
      },
    }));
    setGeneralError(null);
  };

  const handleFeedbackChange = (studentId: number, val: string) => {
    setGradeInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        feedback: val,
      },
    }));
  };

  const handleFillAllMaxScore = () => {
    if (!confirm(`Fill all empty marks with full score (${assessment.maxScore})?`)) return;
    setGradeInputs((prev) => {
      const next = { ...prev };
      students?.forEach((s) => {
        if (!next[s.id!] || next[s.id!].score === "") {
          next[s.id!] = {
            score: String(assessment.maxScore),
            feedback: next[s.id!]?.feedback || "",
          };
        }
      });
      return next;
    });
  };

  const handleClearAllMarks = () => {
    if (!confirm("Clear all entered marks in this sheet?")) return;
    setGradeInputs((prev) => {
      const next = { ...prev };
      students?.forEach((s) => {
        next[s.id!] = {
          score: "",
          feedback: next[s.id!]?.feedback || "",
        };
      });
      return next;
    });
  };

  const handleSaveAll = async () => {
    if (hasValidationErrors) {
      setGeneralError("Please fix the highlighted mark errors before saving.");
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const toUpsert: Array<{
        assessmentId: number;
        studentId: number;
        score: number;
        feedback?: string;
      }> = [];

      Object.entries(gradeInputs).forEach(([studentIdStr, data]) => {
        const val = data.score.trim();
        if (val !== "") {
          const numScore = Number(val);
          if (!isNaN(numScore) && numScore >= 0 && numScore <= assessment.maxScore) {
            toUpsert.push({
              assessmentId: assessment.id!,
              studentId: Number(studentIdStr),
              score: numScore,
              feedback: data.feedback.trim() || undefined,
            });
          }
        }
      });

      if (toUpsert.length > 0) {
        await gradesRepository.batchUpsertGrades(toUpsert);
      }

      setSaveStatus(`Saved ${toUpsert.length} grade entries successfully!`);
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 700);
    } catch (err) {
      setGeneralError("Failed to save grades: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark Sheet: ${assessment.title}`}
      description={`Enter marks for all students. Maximum Allowed Mark: ${assessment.maxScore}.`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Success Alert */}
        {saveStatus && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* Global Validation Error Banner */}
        {hasValidationErrors && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {Object.keys(rowErrors).length} student mark(s) are invalid. Marks must be between 0 and {assessment.maxScore}.
              </span>
            </div>
          </div>
        )}

        {generalError && !hasValidationErrors && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Action helper toolbar */}
        <div className="flex items-center justify-between text-xs pb-1">
          <span className="text-muted-foreground font-medium">
            {students?.length ?? 0} pupils in class • Max: <strong className="text-foreground">{assessment.maxScore}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillAllMaxScore}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Sparkles className="w-3 h-3" /> Fill Empty with Max
            </button>
            <span className="text-muted-foreground">•</span>
            <button
              type="button"
              onClick={handleClearAllMarks}
              className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear All
            </button>
          </div>
        </div>

        {/* Mark Sheet Spreadsheet Table */}
        <div className="border rounded-xl overflow-hidden max-h-[58vh] overflow-y-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/70 border-b text-muted-foreground font-semibold sticky top-0 uppercase text-[10px] tracking-wider z-10 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3 w-40">Score / {assessment.maxScore}</th>
                <th className="px-4 py-3 text-center w-28">% Percentage</th>
                <th className="px-4 py-3">Constructive Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students?.map((student) => {
                const currentData = gradeInputs[student.id!] || {
                  score: "",
                  feedback: "",
                };
                const rowError = rowErrors[student.id!];
                const val = currentData.score.trim();
                const numScore = val !== "" ? Number(val) : NaN;
                const isValidNumber = !isNaN(numScore) && numScore >= 0 && numScore <= assessment.maxScore;
                const pct = isValidNumber
                  ? calculatePercentage(numScore, assessment.maxScore)
                  : null;

                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      rowError
                        ? "bg-destructive/5 dark:bg-destructive/10"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>
                          {student.lastName}, {student.firstName}
                        </span>
                        {student.preferredName && (
                          <span className="text-[10px] text-muted-foreground">
                            ({student.preferredName})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="space-y-1">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={assessment.maxScore}
                            step="0.5"
                            placeholder="e.g. 45"
                            value={currentData.score}
                            onChange={(e) =>
                              handleScoreChange(student.id!, e.target.value)
                            }
                            className={`w-full h-8 px-2.5 rounded-md border font-mono text-xs transition-colors focus:outline-none ${
                              rowError
                                ? "border-destructive bg-destructive/10 text-destructive focus:ring-1 focus:ring-destructive"
                                : "border-input bg-background focus:ring-1 focus:ring-ring"
                            }`}
                          />
                        </div>
                        {rowError && (
                          <span className="text-[10px] text-destructive font-semibold block leading-tight">
                            {rowError}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-center font-semibold">
                      {pct !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            pct >= 75
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : pct >= 50
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        placeholder="Optional feedback..."
                        value={currentData.feedback}
                        onChange={(e) =>
                          handleFeedbackChange(student.id!, e.target.value)
                        }
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {hasValidationErrors ? (
              <span className="text-destructive font-medium">
                Fix errors above to save marks
              </span>
            ) : (
              <span>Ready to save mark sheet</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={hasValidationErrors || isSubmitting}
              isLoading={isSubmitting}
            >
              Save All Grades
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
