import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { lessonsRepository } from "@/db/repositories/lessons.repository";
import { SETTING_KEYS } from "@/db/repositories/settings.repository";
import { formatDateWithDay } from "@/lib/utils";
import {
  generateTimetableLessonSlots,
  getNextAvailableTimetableSlot,
  findMatchingTimetableSchedule,
  formatLocalDateString,
  type TimetableLessonSlot,
} from "@/lib/timetableSlotGenerator";
import {
  BookOpen,
  FileCheck,
  AlertCircle,
  Calendar,
  Sparkles,
} from "lucide-react";
import type { ClassLesson, LessonStatus, AcademicYearConfig } from "@/types/database";

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  initialData?: ClassLesson | null;
  preselectedDate?: string;
  totalExistingLessons?: number;
  onSaved?: (lessonId: number) => void;
}

export function LessonModal({
  isOpen,
  onClose,
  classId,
  initialData,
  preselectedDate,
  totalExistingLessons = 0,
  onSaved,
}: LessonModalProps) {
  const [title, setTitle] = useState("");
  const [unitOrTopic, setUnitOrTopic] = useState("");
  const [lessonNumber, setLessonNumber] = useState<number>(1);
  const [lessonDate, setLessonDate] = useState("");
  const [status, setStatus] = useState<LessonStatus>("planned");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Live query class weekly timetable schedules
  const schedules = useLiveQuery(
    () => db.classSchedules.where("classId").equals(classId).toArray(),
    [classId]
  );

  // Live query academic year settings for term dates & holidays
  const academicYearSetting = useLiveQuery(
    () => db.settings.get(SETTING_KEYS.ACADEMIC_YEAR),
    []
  );
  const academicConfig = academicYearSetting?.value as AcademicYearConfig | undefined;

  // Live query existing lessons to determine the highest existing date
  const existingLessons = useLiveQuery(
    () => db.lessons.where("classId").equals(classId).toArray(),
    [classId]
  );

  // Upcoming timetable slots for quick picking
  const timetableSlots = useMemo<TimetableLessonSlot[]>(() => {
    if (!schedules || schedules.length === 0) return [];
    return generateTimetableLessonSlots({
      schedules,
      startDate: academicConfig?.startDate || formatLocalDateString(new Date()),
      maxCount: 24,
      academicYearConfig: academicConfig,
    });
  }, [schedules, academicConfig]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setUnitOrTopic(initialData.unitOrTopic || "");
      setLessonNumber(initialData.lessonNumber || initialData.orderIndex || 1);
      setLessonDate(initialData.lessonDate || "");
      setStatus(initialData.status);
      setAssignmentTitle(initialData.assignmentTitle || "");
      setAssignmentDueDate(initialData.assignmentDueDate || "");
      setAssignmentNotes(initialData.assignmentNotes || "");
      setLearningObjectives(initialData.learningObjectives || "");
      setNotes(initialData.notes || "");
    } else {
      setTitle("");
      setUnitOrTopic("");
      setLessonNumber(totalExistingLessons + 1);

      if (preselectedDate) {
        setLessonDate(preselectedDate);
      } else if (schedules && schedules.length > 0) {
        // Auto-pick the next arranged timetable slot after existing lessons!
        const sortedDates = existingLessons
          ?.map((l) => l.lessonDate)
          .filter(Boolean) as string[] | undefined;
        sortedDates?.sort();
        const latestDate = sortedDates && sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : undefined;
        const nextSlot = getNextAvailableTimetableSlot(schedules, latestDate, academicConfig);

        if (nextSlot) {
          setLessonDate(nextSlot.date);
        } else {
          setLessonDate(new Date().toISOString().split("T")[0]);
        }
      } else {
        setLessonDate(new Date().toISOString().split("T")[0]);
      }

      setStatus("planned");
      setAssignmentTitle("");
      setAssignmentDueDate("");
      setAssignmentNotes("");
      setLearningObjectives("");
      setNotes("");
    }
    setError("");
  }, [initialData, preselectedDate, totalExistingLessons, isOpen, schedules, existingLessons, academicConfig]);

  // Check if current lessonDate matches a scheduled timetable period
  const matchingSchedule = useMemo(() => {
    if (!lessonDate || !schedules) return undefined;
    return findMatchingTimetableSchedule(lessonDate, schedules);
  }, [lessonDate, schedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Lesson title is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await lessonsRepository.update(initialData.id, {
          title: title.trim(),
          unitOrTopic: unitOrTopic.trim() || undefined,
          lessonNumber: Number(lessonNumber) || 1,
          lessonDate: lessonDate || undefined,
          status,
          assignmentTitle: assignmentTitle.trim() || undefined,
          assignmentDueDate: assignmentDueDate || undefined,
          assignmentNotes: assignmentNotes.trim() || undefined,
          learningObjectives: learningObjectives.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await lessonsRepository.create({
          classId,
          title: title.trim(),
          unitOrTopic: unitOrTopic.trim() || undefined,
          lessonNumber: Number(lessonNumber) || totalExistingLessons + 1,
          lessonDate: lessonDate || undefined,
          status,
          assignmentTitle: assignmentTitle.trim() || undefined,
          assignmentDueDate: assignmentDueDate || undefined,
          assignmentNotes: assignmentNotes.trim() || undefined,
          learningObjectives: learningObjectives.trim() || undefined,
          notes: notes.trim() || undefined,
          orderIndex: totalExistingLessons + 1,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save lesson.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Lesson Plan & Assignment" : "Add Lesson from Class Timetable"}
      description="Plan curriculum milestones, choose from arranged timetable dates, and track homework."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Lesson Title"
              placeholder="e.g. Unit 1: Arabic Alphabet & Long Vowels"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError("");
              }}
              required
            />
          </div>

          <div>
            <Input
              label="Lesson Order / #"
              type="number"
              min={1}
              value={lessonNumber}
              onChange={(e) => setLessonNumber(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Date & Timetable Selector Section */}
        <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Lesson Date & Timetable Slot
            </div>

            {/* Quick selector dropdown from arranged weekly timetable slots */}
            {timetableSlots.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  Pick from Timetable:
                </span>
                <select
                  value={lessonDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setLessonDate(e.target.value);
                      const slot = timetableSlots.find((s) => s.date === e.target.value);
                      if (slot && slot.room && !notes) {
                        setNotes(`Timetable period: ${slot.startTime} - ${slot.endTime} (Room: ${slot.room})`);
                      }
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg border bg-background text-xs font-medium focus:outline-hidden max-w-[200px] truncate cursor-pointer shadow-2xs"
                >
                  <option value="">Choose scheduled date...</option>
                  {timetableSlots.map((slot) => (
                    <option key={slot.date} value={slot.date}>
                      {slot.dayName}, {slot.date} ({slot.startTime}–{slot.endTime})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                label="Scheduled / Taught Date"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
              />
              {lessonDate && (
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 mt-1 block">
                  📅 {formatDateWithDay(lessonDate, true)}
                </span>
              )}
            </div>

            <div>
              <Input
                label="Unit / Topic (Optional)"
                placeholder="e.g. Unit 1: Greetings"
                value={unitOrTopic}
                onChange={(e) => setUnitOrTopic(e.target.value)}
              />
            </div>

            <div>
              <Select
                label="Delivery Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as LessonStatus)}
              >
                <option value="planned">⚪ Planned</option>
                <option value="in_progress">🟡 In Progress</option>
                <option value="completed">🟢 Completed</option>
                <option value="skipped">⚪ Skipped / Cancelled</option>
              </Select>
            </div>
          </div>

          {/* Matched Timetable Period Notification */}
          {matchingSchedule ? (
            <div className="px-3 py-1.5 rounded-lg bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  Matches Class Timetable: <strong className="capitalize">{matchingSchedule.dayOfWeek}</strong> ({matchingSchedule.startTime} – {matchingSchedule.endTime})
                </span>
              </span>
              {matchingSchedule.room && (
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 shrink-0">
                  Room: {matchingSchedule.room}
                </span>
              )}
            </div>
          ) : lessonDate && schedules && schedules.length > 0 ? (
            <div className="text-[11px] text-muted-foreground italic px-1">
              Note: This date does not fall on the class's arranged weekly timetable days ({schedules.map((s) => s.dayOfWeek).join(", ")}).
            </div>
          ) : null}
        </div>

        {/* Assigned Homework / Task Section */}
        <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Assigned Homework / Task
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Assignment Title / Description"
                placeholder="e.g. Workbook Page 14 Exercises 1–4"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Due Date"
                type="date"
                value={assignmentDueDate}
                onChange={(e) => setAssignmentDueDate(e.target.value)}
              />
              {assignmentDueDate && (
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1 block">
                  Due: {formatDateWithDay(assignmentDueDate, true)}
                </span>
              )}
            </div>
          </div>

          <Textarea
            label="Assignment Instructions / Submission Notes (Optional)"
            placeholder="Special instructions, online submission links, or rubric notes..."
            value={assignmentNotes}
            onChange={(e) => setAssignmentNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Learning Objectives & Teacher Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Textarea
            label="Learning Objectives (Optional)"
            placeholder="e.g. Identify short and long vowels; pronounce emphatic consonants with accuracy..."
            value={learningObjectives}
            onChange={(e) => setLearningObjectives(e.target.value)}
            rows={3}
          />

          <Textarea
            label="Teacher Reflections / Lesson Notes"
            placeholder="Key reminders, student pace notes, or follow-up items..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-1.5">
            <BookOpen className="w-4 h-4" />
            {initialData ? "Save Changes" : "Add to Progress Map"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
