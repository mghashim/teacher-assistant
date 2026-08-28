import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { schedulesRepository } from "@/db/repositories/schedules.repository";
import type { ClassSchedule, DayOfWeek } from "@/types/database";

const DAYS_OF_WEEK: Array<{ value: DayOfWeek; label: string }> = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

interface ClassScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  initialData?: ClassSchedule | null;
  onSaved?: () => void;
}

export function ClassScheduleModal({
  isOpen,
  onClose,
  classId,
  initialData,
  onSaved,
}: ClassScheduleModalProps) {
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setDayOfWeek(initialData.dayOfWeek);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setRoom(initialData.room || "");
      setNotes(initialData.notes || "");
    } else {
      setDayOfWeek("monday");
      setStartTime("09:00");
      setEndTime("09:45");
      setRoom("");
      setNotes("");
    }
    setError("");
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setError("Start time and End time are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await schedulesRepository.update(initialData.id, {
          dayOfWeek,
          startTime,
          endTime,
          room: room.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await schedulesRepository.create({
          classId,
          dayOfWeek,
          startTime,
          endTime,
          room: room.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save lesson schedule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Scheduled Lesson" : "Add Scheduled Lesson"}
      description="Define day of week, lesson duration, and classroom room/location."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <Select
          label="Day of Week"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
          options={DAYS_OF_WEEK}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />

          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <Input
          label="Room / Location"
          placeholder="e.g. Room 204 or Lab B"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />

        <Input
          label="Lesson Notes (Optional)"
          placeholder="e.g. Vocabulary & Speaking lab"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? "Save Lesson" : "Add Lesson"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
