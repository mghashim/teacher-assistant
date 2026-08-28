import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { assessmentsRepository } from "@/db/repositories/assessments.repository";
import { AlertCircle } from "lucide-react";
import type { Assessment, AssessmentType } from "@/types/database";

const ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string }> = [
  { value: "exam", label: "Exam" },
  { value: "mock", label: "Mock Exam" },
  { value: "quiz", label: "Quiz / Test" },
  { value: "speaking", label: "Speaking / Oral" },
  { value: "writing", label: "Writing Assessment" },
  { value: "reading", label: "Reading Comprehension" },
  { value: "listening", label: "Listening Assessment" },
  { value: "assignment", label: "Assignment" },
  { value: "practical", label: "Practical" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassId?: number;
  initialData?: Assessment | null;
  onSaved?: (assessmentId: number) => void;
}

export function AssessmentModal({
  isOpen,
  onClose,
  defaultClassId,
  initialData,
  onSaved,
}: AssessmentModalProps) {
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);

  const [classId, setClassId] = useState<number>(defaultClassId || 0);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssessmentType>("speaking");
  const [maxScoreStr, setMaxScoreStr] = useState<string>("30");
  const [assessmentDate, setAssessmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setClassId(initialData.classId);
      setTitle(initialData.title);
      setType(initialData.type);
      setMaxScoreStr(String(initialData.maxScore));
      setAssessmentDate(initialData.assessmentDate || new Date().toISOString().split("T")[0]);
      setDescription(initialData.description || "");
      setNotes(initialData.notes || "");
    } else {
      if (defaultClassId) setClassId(defaultClassId);
      else if (classes && classes.length > 0) setClassId(classes[0].id!);

      setTitle("");
      setType("speaking");
      setMaxScoreStr("30");
      setAssessmentDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setNotes("");
    }
    setError("");
  }, [initialData, defaultClassId, classes, isOpen]);

  const maxScoreError = useMemo(() => {
    const trimmed = maxScoreStr.trim();
    if (trimmed === "") return "Maximum score is required";
    const num = Number(trimmed);
    if (isNaN(num)) return "Maximum score must be a valid number";
    if (num <= 0) return "Maximum score must be greater than 0";
    return "";
  }, [maxScoreStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Assessment title is required.");
      return;
    }
    if (!classId) {
      setError("Please select an assigned class.");
      return;
    }
    if (maxScoreError) {
      setError(maxScoreError);
      return;
    }

    const maxScore = Number(maxScoreStr);
    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await assessmentsRepository.update(initialData.id, {
          classId,
          title: title.trim(),
          type,
          maxScore,
          assessmentDate: assessmentDate || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await assessmentsRepository.create({
          classId,
          title: title.trim(),
          type,
          maxScore,
          assessmentDate: assessmentDate || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Assessment" : "Create New Assessment"}
      description="Define assessment criteria, category, date, and maximum mark."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Assigned Class"
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            required
          >
            <option value={0}>Select a class...</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Assessment Type"
            value={type}
            onChange={(e) => setType(e.target.value as AssessmentType)}
            options={ASSESSMENT_TYPES}
            required
          />
        </div>

        <Input
          label="Assessment Title"
          placeholder="e.g. Speaking Assessment — Unit 1"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Maximum Score / Total Marks"
            type="number"
            min={1}
            step="1"
            value={maxScoreStr}
            error={maxScoreError || undefined}
            onChange={(e) => {
              setMaxScoreStr(e.target.value);
              setError("");
            }}
            required
          />

          <Input
            label="Assessment Date"
            type="date"
            value={assessmentDate}
            onChange={(e) => setAssessmentDate(e.target.value)}
          />
        </div>

        <Textarea
          label="Description / Criteria (Optional)"
          placeholder="Rubrics, sections, examination board specifications..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={Boolean(maxScoreError) || isSubmitting}
            isLoading={isSubmitting}
          >
            {initialData ? "Save Changes" : "Create Assessment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
