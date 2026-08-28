import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { gradesRepository } from "@/db/repositories/grades.repository";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { calculatePercentage } from "@/lib/calculations";
import { CheckCircle2 } from "lucide-react";
import type { Assessment, Student, Grade } from "@/types/database";

interface GradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
}

export function GradeEntryModal({
  isOpen,
  onClose,
  assessment,
}: GradeEntryModalProps) {
  const [gradeInputs, setGradeInputs] = useState<
    Record<number, { score: string; feedback: string }>
  >({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
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
      const state: Record<number, { score: string; feedback: string }> = {};
      students.forEach((student) => {
        const found = existingGrades.find((g) => g.studentId === student.id);
        state[student.id!] = {
          score: found ? String(found.score) : "",
          feedback: found?.feedback || "",
        };
      });
      setGradeInputs(state);
    }
  }, [students, existingGrades, isOpen]);

  if (!assessment) return null;

  const handleScoreChange = (studentId: number, val: string) => {
    setGradeInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: val,
      },
    }));
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

  const handleSaveAll = async () => {
    setIsSubmitting(true);
    try {
      const toUpsert: Array<{
        assessmentId: number;
        studentId: number;
        score: number;
        feedback?: string;
      }> = [];

      Object.entries(gradeInputs).forEach(([studentIdStr, data]) => {
        if (data.score !== "") {
          const numScore = Number(data.score);
          if (!isNaN(numScore)) {
            toUpsert.push({
              assessmentId: assessment.id!,
              studentId: Number(studentIdStr),
              score: Math.min(Math.max(0, numScore), assessment.maxScore),
              feedback: data.feedback.trim() || undefined,
            });
          }
        }
      });

      if (toUpsert.length > 0) {
        await gradesRepository.batchUpsertGrades(toUpsert);
      }

      setSaveStatus(`Saved ${toUpsert.length} grade entries!`);
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 800);
    } catch (err) {
      alert("Failed to save grades: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark Sheet: ${assessment.title}`}
      description={`Enter marks for all students in this class. Maximum Score: ${assessment.maxScore}.`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {saveStatus && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveStatus}</span>
          </div>
        )}

        <div className="border rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 border-b text-muted-foreground font-semibold sticky top-0 uppercase text-[10px] tracking-wider z-10 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3 w-32">Score / {assessment.maxScore}</th>
                <th className="px-4 py-3 text-center w-24">% Percentage</th>
                <th className="px-4 py-3">Constructive Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students?.map((student) => {
                const currentData = gradeInputs[student.id!] || {
                  score: "",
                  feedback: "",
                };
                const numScore =
                  currentData.score !== "" ? Number(currentData.score) : NaN;
                const pct = !isNaN(numScore)
                  ? calculatePercentage(numScore, assessment.maxScore)
                  : null;

                return (
                  <tr key={student.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {student.lastName}, {student.firstName}
                      {student.preferredName && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({student.preferredName})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={assessment.maxScore}
                        step="0.5"
                        placeholder="Mark"
                        value={currentData.score}
                        onChange={(e) =>
                          handleScoreChange(student.id!, e.target.value)
                        }
                        className="w-full h-8 px-2 rounded-md border border-input bg-background font-mono text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold">
                      {pct !== null ? (
                        <span
                          className={
                            pct >= 75
                              ? "text-emerald-600 dark:text-emerald-400"
                              : pct >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal">—</span>
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
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {students?.length ?? 0} students in register
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveAll} isLoading={isSubmitting}>
              Save All Grades
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
