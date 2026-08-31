import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { gradesRepository } from "@/db/repositories/grades.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
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
  const [deletingGrade, setDeletingGrade] = useState<Grade | null>(null);
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
    async () => {
      const classIds =
        Array.isArray(student.classIds) && student.classIds.length > 0
          ? student.classIds
          : student.classId
          ? [student.classId]
          : [];
      if (classIds.length === 0) return [];
      return db.assessments.where("classId").anyOf(classIds).toArray();
    },
    [student.classId, student.classIds]
  );

  const assessmentsMap = useMemo(() => {
    const map = new Map<number, Assessment>();
    assessments?.forEach((a) => {
      if (a.id) map.set(a.id, a);
    });
    return map;
  }, [assessments]);

  const overallAvg = useMemo(() => {
    if (!studentGrades || !assessmentsMap || studentGrades.length === 0) return 0;
    return calculateStudentOverallAverage(studentGrades, assessmentsMap);
  }, [studentGrades, assessmentsMap]);

  const selectedAssessment = useMemo(() => {
    return assessmentsMap.get(selectedAssessmentId) || null;
  }, [assessmentsMap, selectedAssessmentId]);

  const scoreError = useMemo(() => {
    if (!selectedAssessment) return "";
    const trimmed = scoreStr.trim();
    if (trimmed === "") return "Score is required";
    const num = Number(trimmed);
    if (isNaN(num)) return "Score must be a number";
    if (num < 0) return "Score cannot be negative";
    if (num > selectedAssessment.maxScore) {
      return `Score cannot exceed maximum mark of ${selectedAssessment.maxScore}`;
    }
    return "";
  }, [scoreStr, selectedAssessment]);

  const currentPercentage = useMemo(() => {
    if (!selectedAssessment) return 0;
    const num = Number(scoreStr);
    if (isNaN(num) || num < 0) return 0;
    return calculatePercentage(num, selectedAssessment.maxScore);
  }, [scoreStr, selectedAssessment]);

  const handleOpenAdd = () => {
    setEditingGrade(null);
    setSelectedAssessmentId(assessments?.[0]?.id || 0);
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

  const handleConfirmDeleteGrade = async () => {
    if (!deletingGrade?.id) return;
    await gradesRepository.delete(deletingGrade.id);
    setDeletingGrade(null);
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
        studentId: student.id!,
        assessmentId: selectedAssessmentId,
        score: numScore,
        feedback: feedback.trim() || undefined,
      });
      setIsModalOpen(false);
    } catch (err) {
      setError((err as Error).message || "Failed to record mark.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Student Overall Average
            </div>
            <div className="text-2xl font-bold tracking-tight mt-0.5">
              {overallAvg > 0 ? `${overallAvg.toFixed(1)}%` : "No marks entered"}
            </div>
          </div>
        </div>

        <Button onClick={handleOpenAdd} className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Record Mark</span>
        </Button>
      </div>

      {/* Grades List Table */}
      {!studentGrades || studentGrades.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No assessment grades recorded"
          description="Start recording marks, mock exam results, and oral speaking grades for this student."
          actionLabel="Record First Mark"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Assessment Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Score / Max</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4">Teacher Feedback</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {studentGrades.map((grade) => {
                  const assessment = assessmentsMap.get(grade.assessmentId);
                  const maxScore = assessment?.maxScore || 100;
                  const pct = calculatePercentage(grade.score, maxScore);

                  return (
                    <tr key={grade.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {assessment?.title || `Assessment #${grade.assessmentId}`}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="capitalize text-[11px]">
                          {assessment?.type || "Assessment"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {formatDate(grade.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">
                        {grade.score} / {maxScore}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={pct >= 70 ? "success" : pct >= 50 ? "warning" : "destructive"}
                          className="font-bold"
                        >
                          {pct.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {grade.feedback || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(grade)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                            title="Edit mark"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingGrade(grade)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete mark"
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

      {/* Record / Edit Grade Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGrade ? "Edit Student Mark" : "Record Assessment Mark"}
        description="Select the assessment and input score and optional teacher constructive feedback."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Select
            label="Select Assessment"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(Number(e.target.value))}
            required
          >
            <option value={0}>Choose assessment...</option>
            {assessments?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.type}, Max: {a.maxScore})
              </option>
            ))}
          </Select>

          {selectedAssessment && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 items-start">
                <Input
                  label={`Score (Max: ${selectedAssessment.maxScore})`}
                  type="number"
                  min={0}
                  max={selectedAssessment.maxScore}
                  step="0.5"
                  value={scoreStr}
                  error={scoreError || undefined}
                  onChange={(e) => {
                    setScoreStr(e.target.value);
                    setError("");
                  }}
                  required
                  autoFocus
                />

                <div className="pt-6">
                  <div className="p-2.5 rounded-lg bg-muted/60 border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Percentage:</span>
                    <Badge
                      variant={
                        currentPercentage >= 70
                          ? "success"
                          : currentPercentage >= 50
                          ? "warning"
                          : "destructive"
                      }
                      className="font-bold font-mono"
                    >
                      {currentPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

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

      {/* Delete Grade Confirmation Modal with Password */}
      <ConfirmationModal
        isOpen={deletingGrade !== null}
        onClose={() => setDeletingGrade(null)}
        onConfirm={handleConfirmDeleteGrade}
        title="Delete Grade Entry"
        message={`Are you sure you want to permanently delete this grade score (${deletingGrade?.score} marks) for ${assessmentsMap.get(deletingGrade?.assessmentId || 0)?.title || "this assessment"}?`}
        confirmText="Delete Grade"
        variant="destructive"
        requirePassword={true}
      />
    </div>
  );
}
