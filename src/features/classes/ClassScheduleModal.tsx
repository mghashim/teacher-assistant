import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { schedulesRepository } from "@/db/repositories/schedules.repository";
import { AlertCircle } from "lucide-react";
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
  classId?: number;
  defaultDayOfWeek?: DayOfWeek;
  initialData?: ClassSchedule | null;
  onSaved?: () => void;
}

export function ClassScheduleModal({
  isOpen,
  onClose,
  classId,
  defaultDayOfWeek,
  initialData,
  onSaved,
}: ClassScheduleModalProps) {
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);

  const [selectedClassId, setSelectedClassId] = useState<number>(classId || 0);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(defaultDayOfWeek || "monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setSelectedClassId(initialData.classId);
      setDayOfWeek(initialData.dayOfWeek);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setRoom(initialData.room || "");
      setNotes(initialData.notes || "");
    } else {
      setSelectedClassId(classId || (classes && classes.length > 0 ? classes[0].id! : 0));
      setDayOfWeek(defaultDayOfWeek || "monday");
      setStartTime("09:00");
      setEndTime("09:45");
      setRoom("");
      setNotes("");
    }
    setError("");
  }, [initialData, isOpen, classId, defaultDayOfWeek, classes]);

  const timeError = useMemo(() => {
    if (startTime && endTime && startTime >= endTime) {
      return "End time must be later than start time.";
    }
    return "";
  }, [startTime, endTime]);

  const classOptions = useMemo(() => {
    if (!classes) return [];
    return classes.map((c) => ({
      value: String(c.id),
      label: `${c.name}${c.subject ? ` (${c.subject})` : ""}`,
    }));
  }, [classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClassId = classId || selectedClassId;

    if (!targetClassId) {
      setError("Please select a valid class for this lesson schedule.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Start time and End time are required.");
      return;
    }
    if (timeError) {
      setError(timeError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await schedulesRepository.update(initialData.id, {
          classId: targetClassId,
          dayOfWeek,
          startTime,
          endTime,
          room: room.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await schedulesRepository.create({
          classId: targetClassId,
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
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!classId && (
          <Select
            label="Target Class"
            value={String(selectedClassId)}
            onChange={(e) => setSelectedClassId(Number(e.target.value))}
            options={classOptions}
            required
          />
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
            onChange={(e) => {
              setStartTime(e.target.value);
              setError("");
            }}
            required
          />

          <Input
            label="End Time"
            type="time"
            value={endTime}
            error={timeError || undefined}
            onChange={(e) => {
              setEndTime(e.target.value);
              setError("");
            }}
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
          <Button
            type="submit"
            disabled={Boolean(timeError) || isSubmitting}
            isLoading={isSubmitting}
          >
            {initialData ? "Save Lesson" : "Add Lesson"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
