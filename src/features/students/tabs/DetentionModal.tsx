import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { detentionsRepository } from "@/db/repositories/detentions.repository";
import type { Detention, DetentionType } from "@/types/database";

export const DETENTION_TYPES: Array<{ value: DetentionType; label: string }> = [
  { value: "break", label: "Break Detention" },
  { value: "lunch", label: "Lunch Detention" },
  { value: "8:00-am", label: "8:00 am Detention" },
  { value: "after-school", label: "After School Detention" },
  { value: "department", label: "Department Detention" },
  { value: "other", label: "Other" },
];

export const DETENTION_REASONS = [
  "Homework Not Completed",
  "Missing Equipment",
  "Failure to Follow Instructions",
  "Refusal to Follow Instructions",
  "Persistent Talking",
  "Disruptive Behaviour",
  "Lack of Attention",
  "Interrupting the Teacher",
  "Talking Out of Turn",
  "Off Task",
] as const;

interface DetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: number;
  defaultClassId?: number;
  initialData?: Detention | null;
  onSaved?: (detentionId: number) => void;
}

export function DetentionModal({
  isOpen,
  onClose,
  defaultStudentId,
  defaultClassId,
  initialData,
  onSaved,
}: DetentionModalProps) {
  const students = useLiveQuery(() => db.students.orderBy("lastName").toArray(), []);
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);

  const [studentId, setStudentId] = useState<number>(defaultStudentId || 0);
  const [classId, setClassId] = useState<number>(defaultClassId || 0);
  const [type, setType] = useState<DetentionType>("lunch");
  const [detentionDate, setDetentionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedReasonOption, setSelectedReasonOption] = useState<string>(DETENTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setStudentId(initialData.studentId);
      setClassId(initialData.classId);
      setType(initialData.type);
      setDetentionDate(initialData.detentionDate);
      
      // Check if reason matches one of the standard reasons
      if (DETENTION_REASONS.includes(initialData.reason as typeof DETENTION_REASONS[number])) {
        setSelectedReasonOption(initialData.reason);
        setCustomReason("");
      } else {
        setSelectedReasonOption("custom");
        setCustomReason(initialData.reason);
      }
      setNotes(initialData.notes || "");
    } else {
      if (defaultStudentId) setStudentId(defaultStudentId);
      else if (students && students.length > 0) setStudentId(students[0].id!);

      if (defaultClassId) setClassId(defaultClassId);
      else if (classes && classes.length > 0) setClassId(classes[0].id!);

      setType("lunch");
      setDetentionDate(new Date().toISOString().split("T")[0]);
      setSelectedReasonOption(DETENTION_REASONS[0]);
      setCustomReason("");
      setNotes("");
    }
    setError("");
  }, [initialData, defaultStudentId, defaultClassId, students, classes, isOpen]);

  const handleStudentChange = (newStudentId: number) => {
    setStudentId(newStudentId);
    const targetStudent = students?.find((s) => s.id === newStudentId);
    if (targetStudent) {
      setClassId(targetStudent.classId);
    }
  };

  const getEffectiveReason = () => {
    if (selectedReasonOption === "custom") {
      return customReason.trim();
    }
    return selectedReasonOption;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = getEffectiveReason();

    if (!finalReason) {
      setError("Reason for detention is required.");
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
      if (initialData && initialData.id) {
        await detentionsRepository.update(initialData.id, {
          studentId,
          classId: finalClassId,
          type,
          detentionDate,
          reason: finalReason,
          notes: notes.trim() || undefined,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await detentionsRepository.create({
          studentId,
          classId: finalClassId,
          type,
          detentionDate,
          reason: finalReason,
          notes: notes.trim() || undefined,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save detention record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Detention Record" : "Issue Detention"}
      description="Record a disciplinary detention entry with date, reason, and follow-up notes."
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
          <Select
            label="Detention Type"
            value={type}
            onChange={(e) => setType(e.target.value as DetentionType)}
            options={DETENTION_TYPES}
            required
          />

          <Input
            label="Detention Date"
            type="date"
            value={detentionDate}
            onChange={(e) => setDetentionDate(e.target.value)}
            required
          />
        </div>

        {/* Reason for Detention - Dropdown with standard reasons + Custom option */}
        <div className="space-y-2">
          <Select
            label="Reason for Detention"
            value={selectedReasonOption}
            onChange={(e) => setSelectedReasonOption(e.target.value)}
            required
          >
            {DETENTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="custom">Other / Custom Reason...</option>
          </Select>

          {selectedReasonOption === "custom" && (
            <Input
              label="Specify Custom Reason"
              placeholder="e.g. Incomplete coursework, safety violation..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              required
              autoFocus
            />
          )}
        </div>

        <Textarea
          label="Notes / Parent Notification"
          placeholder="e.g. Parent informed via phone, catch-up task completed during detention..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" isLoading={isSubmitting}>
            {initialData ? "Save Changes" : "Log Detention"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
