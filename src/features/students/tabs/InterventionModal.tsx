import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { interventionsRepository } from "@/db/repositories/interventions.repository";
import { Star, Clock, Sparkles } from "lucide-react";
import type { Intervention, InterventionType } from "@/types/database";

export const INTERVENTION_TYPES: Array<{ value: InterventionType; label: string; description: string }> = [
  { value: "1-to-1", label: "1 to 1", description: "Direct individual targeted coaching" },
  { value: "after-school", label: "After School", description: "Extended support & catch-up session" },
  { value: "break-time", label: "Break Time", description: "Short recess / interval check-in" },
  { value: "other", label: "Other / Custom", description: "Other specialized support" },
];

export const EFFECTIVENESS_LABELS: Record<number, { title: string; subtitle: string; color: string }> = {
  1: { title: "1 / 5 – Ineffective", subtitle: "Needs alternative intervention strategy", color: "text-rose-500" },
  2: { title: "2 / 5 – Low Impact", subtitle: "Limited engagement or minimal progress", color: "text-amber-500" },
  3: { title: "3 / 5 – Moderate", subtitle: "Partial understanding and positive effort", color: "text-blue-500" },
  4: { title: "4 / 5 – Effective", subtitle: "Noticeable improvement and solid mastery", color: "text-emerald-500" },
  5: { title: "5 / 5 – Highly Effective", subtitle: "Major breakthrough & key learning milestone", color: "text-emerald-600 font-bold" },
};

/**
 * Calculate duration in human-readable format between two HH:mm strings
 */
export function calculateDuration(startTime: string, endTime: string): string | null {
  if (!startTime || !endTime) return null;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;

  let totalMinutes = endH * 60 + endM - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // handle wrap-around if any

  if (totalMinutes === 0) return "0 mins";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min${minutes > 1 ? "s" : ""}`;
  if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours} hr ${minutes} mins`;
}

interface InterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: number;
  defaultClassId?: number;
  initialData?: Intervention | null;
  onSaved?: (interventionId: number) => void;
}

export function InterventionModal({
  isOpen,
  onClose,
  defaultStudentId,
  defaultClassId,
  initialData,
  onSaved,
}: InterventionModalProps) {
  const students = useLiveQuery(() => db.students.orderBy("lastName").toArray(), []);
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);

  const [studentId, setStudentId] = useState<number>(defaultStudentId || 0);
  const [classId, setClassId] = useState<number>(defaultClassId || 0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("14:30");
  const [type, setType] = useState<InterventionType>("1-to-1");
  const [customType, setCustomType] = useState("");
  const [comment, setComment] = useState("");
  const [effectiveness, setEffectiveness] = useState<number>(4);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setStudentId(initialData.studentId);
      setClassId(initialData.classId || 0);
      setDate(initialData.date);
      setStartTime(initialData.startTime || "14:00");
      setEndTime(initialData.endTime || "14:30");

      if (["1-to-1", "after-school", "break-time"].includes(initialData.type)) {
        setType(initialData.type);
        setCustomType("");
      } else {
        setType("other");
        setCustomType(initialData.type);
      }

      setComment(initialData.comment || "");
      setEffectiveness(initialData.effectiveness || 4);
    } else {
      if (defaultStudentId) setStudentId(defaultStudentId);
      else if (students && students.length > 0) setStudentId(students[0].id!);

      if (defaultClassId) setClassId(defaultClassId);
      else if (classes && classes.length > 0) setClassId(classes[0].id!);

      setDate(new Date().toISOString().split("T")[0]);
      setStartTime("14:00");
      setEndTime("14:30");
      setType("1-to-1");
      setCustomType("");
      setComment("");
      setEffectiveness(4);
    }
    setError("");
    setHoverRating(null);
  }, [initialData, defaultStudentId, defaultClassId, students, classes, isOpen]);

  const handleStudentChange = (newStudentId: number) => {
    setStudentId(newStudentId);
    const targetStudent = students?.find((s) => s.id === newStudentId);
    if (targetStudent) {
      setClassId(targetStudent.classId);
    }
  };

  const getEffectiveType = (): string => {
    if (type === "other") {
      return customType.trim() || "Other";
    }
    return type;
  };

  const durationStr = calculateDuration(startTime, endTime);
  const activeRating = hoverRating !== null ? hoverRating : effectiveness;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = getEffectiveType();

    if (!studentId) {
      setError("Please select a student.");
      return;
    }
    if (!comment.trim()) {
      setError("Please enter comments/notes for this intervention.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start and End times are required.");
      return;
    }

    const currentStudent = students?.find((s) => s.id === studentId);
    const finalClassId = classId || currentStudent?.classId || undefined;

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await interventionsRepository.update(initialData.id, {
          studentId,
          classId: finalClassId,
          date,
          startTime,
          endTime,
          type: finalType,
          comment: comment.trim(),
          effectiveness,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await interventionsRepository.create({
          studentId,
          classId: finalClassId,
          date,
          startTime,
          endTime,
          type: finalType,
          comment: comment.trim(),
          effectiveness,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save intervention.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Intervention" : "Add Student Intervention"}
      description="Record targeted learning support, individual sessions, duration, and measure effectiveness."
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

        {/* Date and Type Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Intervention Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Select
            label="Type of Intervention"
            value={type}
            onChange={(e) => setType(e.target.value as InterventionType)}
            required
          >
            {INTERVENTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        {type === "other" && (
          <Input
            label="Specify Custom Type"
            placeholder="e.g. Guided Reading, Sensory Break, Peer Tutoring..."
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            required
            autoFocus
          />
        )}

        {/* Duration: Time Pickers (From / To) */}
        <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Duration & Schedule
            </span>
            {durationStr && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {durationStr}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Input
              label="From (Start Time)"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />

            <Input
              label="To (End Time)"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* 5-Star Effectiveness Rating Selector */}
        <div className="p-3.5 rounded-xl bg-card border shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Intervention Effectiveness (1–5 Stars)
            </label>
            <span className={`text-xs font-semibold ${EFFECTIVENESS_LABELS[activeRating]?.color || ""}`}>
              {EFFECTIVENESS_LABELS[activeRating]?.title}
            </span>
          </div>

          {/* Star selector buttons */}
          <div className="flex items-center justify-center gap-2 py-1.5 bg-muted/30 rounded-lg">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= activeRating;
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => setEffectiveness(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1.5 transition-transform hover:scale-125 focus:outline-hidden"
                  title={`${star} Star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      isFilled
                        ? "fill-amber-400 text-amber-400 filter drop-shadow-xs"
                        : "text-muted-foreground/30 hover:text-muted-foreground/60"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            {EFFECTIVENESS_LABELS[activeRating]?.subtitle}
          </p>
        </div>

        {/* Comments / Notes Textarea */}
        <Textarea
          label="Intervention Comments & Strategy"
          placeholder="Describe topics reviewed, specific exercises tackled, strategies deployed, and student engagement/mastery..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          required
        />

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? "Save Changes" : "Add Intervention"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
