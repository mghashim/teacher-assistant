import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { classesRepository } from "@/db/repositories/classes.repository";
import type { TeacherClass } from "@/types/database";

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: TeacherClass | null;
  onSaved?: (classId: number) => void;
}

export function ClassModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
}: ClassModalProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setSubject(initialData.subject || "");
      setAcademicYear(initialData.academicYear || "");
      setDescription(initialData.description || "");
    } else {
      setName("");
      setSubject("");
      setAcademicYear("2026-2027");
      setDescription("");
    }
    setError("");
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await classesRepository.update(initialData.id, {
          name: name.trim(),
          subject: subject.trim() || undefined,
          academicYear: academicYear.trim() || undefined,
          description: description.trim() || undefined,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await classesRepository.create({
          name: name.trim(),
          subject: subject.trim() || undefined,
          academicYear: academicYear.trim() || undefined,
          description: description.trim() || undefined,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save class.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Class" : "Create New Class"}
      description="Define the class name, subject, academic year, and general teacher notes."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Class Name"
          placeholder="e.g. GCSE Arabic – Year 10"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Subject"
            placeholder="e.g. Arabic Language"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <Input
            label="Academic Year"
            placeholder="e.g. 2026-2027"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
        </div>

        <Textarea
          label="Description / Curriculum Notes"
          placeholder="Optional notes regarding syllabus, exam board, or class objectives..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? "Save Changes" : "Create Class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
