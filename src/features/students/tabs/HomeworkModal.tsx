import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { homeworkRepository } from "@/db/repositories/homework.repository";
import type { Homework, HomeworkType } from "@/types/database";

const HOMEWORK_TYPES: HomeworkType[] = [
  "Written Homework",
  "Reading",
  "Speaking",
  "Vocabulary",
  "Grammar",
  "Research",
  "Project",
  "Revision",
  "Other",
];

interface HomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: number;
  defaultClassId?: number;
  initialData?: Homework | null;
  onSaved?: (homeworkId: number) => void;
}

export function HomeworkModal({
  isOpen,
  onClose,
  defaultStudentId,
  defaultClassId,
  initialData,
  onSaved,
}: HomeworkModalProps) {
  const students = useLiveQuery(() => db.students.orderBy("lastName").toArray(), []);
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);

  const [studentId, setStudentId] = useState<number>(defaultStudentId || 0);
  const [classId, setClassId] = useState<number>(defaultClassId || 0);
  const [type, setType] = useState<string>("Grammar");
  const [title, setTitle] = useState("");
  const [homeworkDate, setHomeworkDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [mark, setMark] = useState<string>("");
  const [maxMark, setMaxMark] = useState<string>("20");
  const [approved, setApproved] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setStudentId(initialData.studentId);
      setClassId(initialData.classId);
      setType(initialData.type);
      setTitle(initialData.title);
      setHomeworkDate(initialData.homeworkDate);
      setMark(initialData.mark !== undefined ? String(initialData.mark) : "");
      setMaxMark(initialData.maxMark !== undefined ? String(initialData.maxMark) : "");
      setApproved(initialData.approved);
      setNotes(initialData.notes || "");
    } else {
      if (defaultStudentId) setStudentId(defaultStudentId);
      else if (students && students.length > 0) setStudentId(students[0].id!);

      if (defaultClassId) setClassId(defaultClassId);
      else if (classes && classes.length > 0) setClassId(classes[0].id!);

      setType("Grammar");
      setTitle("");
      setHomeworkDate(new Date().toISOString().split("T")[0]);
      setMark("");
      setMaxMark("20");
      setApproved(true);
      setNotes("");
    }
    setError("");
  }, [initialData, defaultStudentId, defaultClassId, students, classes, isOpen]);

  // When student changes, automatically infer their classId if not editing
  const handleStudentChange = (newStudentId: number) => {
    setStudentId(newStudentId);
    const targetStudent = students?.find((s) => s.id === newStudentId);
    if (targetStudent) {
      setClassId(targetStudent.classId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Homework title is required.");
      return;
    }
    if (!studentId) {
      setError("Please select a student.");
      return;
    }

    const currentStudent = students?.find((s) => s.id === studentId);
    const finalClassId = classId || currentStudent?.classId || 0;

    setIsSubmitting(true);
    setError("");

    try {
      const parsedMark = mark !== "" ? Number(mark) : undefined;
      const parsedMaxMark = maxMark !== "" ? Number(maxMark) : undefined;

      if (initialData && initialData.id) {
        await homeworkRepository.update(initialData.id, {
          studentId,
          classId: finalClassId,
          type,
          title: title.trim(),
          homeworkDate,
          mark: parsedMark,
          maxMark: parsedMaxMark,
          approved,
          notes: notes.trim() || undefined,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await homeworkRepository.create({
          studentId,
          classId: finalClassId,
          type,
          title: title.trim(),
          homeworkDate,
          mark: parsedMark,
          maxMark: parsedMaxMark,
          approved,
          notes: notes.trim() || undefined,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save homework.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Homework Entry" : "Record Homework Assignment"}
      description="Record homework title, type, date, mark, and teacher approval status."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        {!defaultStudentId && (
          <Select
            label="Student"
            value={studentId}
            onChange={(e) => handleStudentChange(Number(e.target.value))}
            required
          >
            <option value={0}>Select a student...</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName}, {s.firstName}
              </option>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Homework Title / Assignment"
            placeholder="e.g. Exercise 4 — Dual & Plural Rules"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Homework Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {HOMEWORK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Homework Date"
            type="date"
            value={homeworkDate}
            onChange={(e) => setHomeworkDate(e.target.value)}
            required
          />

          <Input
            label="Mark (Optional)"
            type="number"
            placeholder="e.g. 18"
            value={mark}
            onChange={(e) => setMark(e.target.value)}
          />

          <Input
            label="Max Mark (Optional)"
            type="number"
            placeholder="e.g. 20"
            value={maxMark}
            onChange={(e) => setMaxMark(e.target.value)}
          />
        </div>

        <div className="p-3 rounded-lg bg-muted/40 border border-border">
          <Checkbox
            label="Homework Approved"
            description="Indicates that the work has been reviewed, accepted, and marked as satisfactory by the teacher"
            checked={approved}
            onChange={setApproved}
          />
        </div>

        <Textarea
          label="Teacher Notes / Corrections (Optional)"
          placeholder="Submission notes, resubmission instructions, or feedback..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? "Save Homework" : "Record Homework"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
