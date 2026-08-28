import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { gradesRepository } from "@/db/repositories/grades.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { calculatePercentage, calculateStudentOverallAverage } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import { Award, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import type { Student, Grade, Assessment } from "@/types/database";

interface GradesTabProps {
  student: Student;
}

export function GradesTab({ student }: GradesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number>(0);
  const [scoreStr, setScoreStr] = useState<string>("0");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const studentGrades = useLiveQuery(
    () => db.grades.where("studentId").equals(student.id!).toArray(),
    [student.id]
  );
  const assessments = useLiveQuery(
    () => db.assessments.where("classId").equals(student.classId).toArray(),
    [student.classId]
  );

  const assessmentsMap = useMemo(() => {
    const map = new Map<number, Assessment>();
    assessments?.forEach((a) => {
      if (a.id) map.set(a.id, a);
    });
    return map;
  }, [assessments]);

  // Overall student average
  const overallAverage = useMemo(() => {
    if (!studentGrades || !assessmentsMap) return 0;
    return calculateStudentOverallAverage(studentGrades, assessmentsMap);
  }, [studentGrades, assessmentsMap]);

  const currentSelectedAssessment = assessmentsMap.get(selectedAssessmentId);
  const maxScore = currentSelectedAssessment?.maxScore ?? 100;

  // Real-time score error
  const scoreError = useMemo(() => {
    const trimmed = scoreStr.trim();
    if (trimmed === "") return "Score is required";
    const num = Number(trimmed);
    if (isNaN(num)) return "Score must be a valid number";
    if (num < 0) return "Score cannot be negative";
    if (currentSelectedAssessment && num > currentSelectedAssessment.maxScore) {
      return `Score cannot exceed maximum mark of ${currentSelectedAssessment.maxScore}`;
    }
    return "";
  }, [scoreStr, currentSelectedAssessment]);

  const calculatedPct = useMemo(() => {
    const num = Number(scoreStr);
    if (!isNaN(num) && num >= 0 && maxScore > 0) {
      return calculatePercentage(num, maxScore);
    }
    return null;
  }, [scoreStr, maxScore]);

  const handleOpenAdd = () => {
    setEditingGrade(null);
    if (assessments && assessments.length > 0) {
      setSelectedAssessmentId(assessments[0].id!);
    }
    setScoreStr("0");
    setFeedback("");
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setSelectedAssessmentId(grade.assessmentId);
    setScoreStr(String(grade.score));
    setFeedback(grade.feedback || "");
    setError("");
    setIsModalOpen(true);
  };

  const handleDeleteGrade = async (gradeId: number) => {
    if (confirm("Delete this grade entry?")) {
      await gradesRepository.delete(gradeId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessmentId) {
      setError("Please select an assessment.");
      return;
    }

    if (scoreError) {
      setError(scoreError);
      return;
    }

    const numScore = Number(scoreStr);
    setIsSubmitting(true);
    setError("");

    try {
      await gradesRepository.upsertGrade({
        assessmentId: selectedAssessmentId,
        studentId: student.id!,
        score: numScore,
        feedback: feedback.trim() || undefined,
      });
      setIsModalOpen(false);
    } catch (err) {
      setError((err as Error).message || "Failed to save grade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Overall Summary Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border shadow-sm">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Academic Performance
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-bold tracking-tight text-primary">
              {overallAverage}%
            </span>
            <span className="text-xs text-muted-foreground">
              Cumulative Average across {studentGrades?.length ?? 0} assessments
            </span>
          </div>
        </div>

        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Record Grade
        </Button>
      </div>

      {/* Grades Table */}
      {!studentGrades || studentGrades.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No grades recorded yet"
          description="Assessments for this student will appear here once marks are entered."
          actionLabel="Record First Grade"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Percentage</th>
                  <th className="px-4 py-3">Teacher Feedback</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentGrades.map((grade) => {
                  const assessment = assessmentsMap.get(grade.assessmentId);
                  const aMaxScore = assessment?.maxScore ?? 100;
                  const pct = calculatePercentage(grade.score, aMaxScore);

                  return (
                    <tr key={grade.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {assessment?.title || `Assessment #${grade.assessmentId}`}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="uppercase text-[10px]">
                          {assessment?.type || "Assessment"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(assessment?.assessmentDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {grade.score} / {aMaxScore}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            pct >= 75
                              ? "text-emerald-600 dark:text-emerald-400"
                              : pct >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground italic max-w-xs truncate">
                        {grade.feedback || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(grade)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground"
                            title="Edit grade"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGrade(grade.id!)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive"
                            title="Delete grade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGrade ? "Edit Grade Record" : "Record Assessment Grade"}
        description={`Record mark for ${student.firstName} ${student.lastName}.`}
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Select
            label="Assessment"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(Number(e.target.value))}
            disabled={editingGrade !== null}
            required
          >
            <option value={0}>Select assessment...</option>
            {assessments?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} (Max: {a.maxScore})
              </option>
            ))}
          </Select>

          <div className="space-y-1">
            <Input
              label={`Score (Maximum: ${maxScore})`}
              type="number"
              min={0}
              max={maxScore}
              step="0.5"
              value={scoreStr}
              error={scoreError || undefined}
              onChange={(e) => {
                setScoreStr(e.target.value);
                setError("");
              }}
              required
            />

            {calculatedPct !== null && !scoreError && (
              <div className="text-[11px] text-muted-foreground pt-0.5">
                Calculated result: <strong className="text-foreground">{calculatedPct}%</strong>
              </div>
            )}
          </div>

          <Textarea
            label="Teacher Feedback Notes (Optional)"
            placeholder="Strengths, areas for revision, constructive guidance..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={Boolean(scoreError) || isSubmitting}
              isLoading={isSubmitting}
            >
              {editingGrade ? "Update Grade" : "Save Grade"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
