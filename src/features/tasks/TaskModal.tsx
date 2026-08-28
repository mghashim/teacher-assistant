import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { tasksRepository } from "@/db/repositories/tasks.repository";
import type { Task } from "@/types/database";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassId?: number;
  defaultStudentId?: number;
  initialData?: Task | null;
  onSaved?: (taskId: number) => void;
}

export function TaskModal({
  isOpen,
  onClose,
  defaultClassId,
  defaultStudentId,
  initialData,
  onSaved,
}: TaskModalProps) {
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);
  const students = useLiveQuery(() => db.students.orderBy("lastName").toArray(), []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState<number | undefined>(defaultClassId);
  const [studentId, setStudentId] = useState<number | undefined>(defaultStudentId);
  const [dueDate, setDueDate] = useState("");
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setClassId(initialData.classId);
      setStudentId(initialData.studentId);
      setDueDate(initialData.dueDate || "");
      setCompleted(initialData.completed);
    } else {
      setTitle("");
      setDescription("");
      setClassId(defaultClassId);
      setStudentId(defaultStudentId);
      setDueDate(new Date().toISOString().split("T")[0]);
      setCompleted(false);
    }
    setError("");
  }, [initialData, defaultClassId, defaultStudentId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await tasksRepository.update(initialData.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          classId: classId || undefined,
          studentId: studentId || undefined,
          dueDate: dueDate || undefined,
          completed,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await tasksRepository.create({
          title: title.trim(),
          description: description.trim() || undefined,
          classId: classId || undefined,
          studentId: studentId || undefined,
          dueDate: dueDate || undefined,
          completed,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Task" : "Create Teacher Task"}
      description="Add reminders, grading deadlines, or follow-up tasks."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Task Title"
          placeholder="e.g. Prepare GCSE Arabic speaking cards"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Related Class (Optional)"
            value={classId || 0}
            onChange={(e) =>
              setClassId(Number(e.target.value) === 0 ? undefined : Number(e.target.value))
            }
          >
            <option value={0}>None / General Task</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Related Student (Optional)"
            value={studentId || 0}
            onChange={(e) =>
              setStudentId(Number(e.target.value) === 0 ? undefined : Number(e.target.value))
            }
          >
            <option value={0}>None</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName}, {s.firstName}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Due Date (Optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="pt-6">
            <Checkbox
              label="Mark Completed"
              checked={completed}
              onChange={setCompleted}
            />
          </div>
        </div>

        <Textarea
          label="Description / Checklist Notes (Optional)"
          placeholder="Additional context or steps needed..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
