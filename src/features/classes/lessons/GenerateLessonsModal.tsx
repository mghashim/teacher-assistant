import { useState, useMemo, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { SETTING_KEYS } from "@/db/repositories/settings.repository";
import {
  generateTimetableLessonSlots,
  formatLocalDateString,
  type TimetableLessonSlot,
} from "@/lib/timetableSlotGenerator";
import {
  Calendar,
  Sparkles,
  Clock,
  MapPin,
  AlertCircle,
} from "lucide-react";
import type { TeacherClass, AcademicYearConfig, ClassLesson } from "@/types/database";

interface GenerateLessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  teacherClass: TeacherClass;
  existingLessons?: ClassLesson[];
  onGenerated?: () => void;
}

export function GenerateLessonsModal({
  isOpen,
  onClose,
  classId,
  teacherClass,
  existingLessons = [],
  onGenerated,
}: GenerateLessonsModalProps) {
  const [slotCount, setSlotCount] = useState<number>(10);
  const [startDate, setStartDate] = useState<string>("");
  const [unitOrTopic, setUnitOrTopic] = useState<string>("");
  const [titlePrefix, setTitlePrefix] = useState<string>("Lesson");
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Initialize start date based on last existing lesson or today / term start
  useEffect(() => {
    if (!isOpen) return;

    if (existingLessons.length > 0) {
      // Find latest existing lesson date
      const sortedDates = existingLessons
        .map((l) => l.lessonDate)
        .filter(Boolean) as string[];
      sortedDates.sort();

      if (sortedDates.length > 0) {
        const lastDate = sortedDates[sortedDates.length - 1];
        // Day after last date
        const parts = lastDate.split("-").map(Number);
        const nextDay = new Date(parts[0], parts[1] - 1, parts[2] + 1);
        setStartDate(formatLocalDateString(nextDay));
      } else {
        setStartDate(formatLocalDateString(new Date()));
      }
    } else if (academicConfig?.startDate) {
      setStartDate(academicConfig.startDate);
    } else {
      setStartDate(formatLocalDateString(new Date()));
    }

    setError("");
  }, [isOpen, existingLessons, academicConfig]);

  // Generate preview of timetable lesson slots
  const previewSlots = useMemo<TimetableLessonSlot[]>(() => {
    if (!schedules || schedules.length === 0 || !startDate) return [];

    return generateTimetableLessonSlots({
      schedules,
      startDate,
      maxCount: Number(slotCount) || 10,
      academicYearConfig: academicConfig,
    });
  }, [schedules, startDate, slotCount, academicConfig]);

  const handleGenerate = async () => {
    if (previewSlots.length === 0) {
      setError("No timetable slots found for the chosen criteria.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const startingLessonNumber = existingLessons.length + 1;
      const now = new Date().toISOString();

      const newLessons: Array<Omit<ClassLesson, "id">> = previewSlots.map(
        (slot, index) => {
          const lessonNumber = startingLessonNumber + index;
          return {
            classId,
            lessonNumber,
            unitOrTopic: unitOrTopic.trim() || undefined,
            title: `${titlePrefix} ${lessonNumber}`,
            lessonDate: slot.date,
            status: "planned",
            notes: slot.room
              ? `Scheduled period: ${slot.startTime} - ${slot.endTime} (Room: ${slot.room})`
              : `Scheduled period: ${slot.startTime} - ${slot.endTime}`,
            orderIndex: startingLessonNumber + index,
            createdAt: now,
            updatedAt: now,
          };
        }
      );

      await db.lessons.bulkAdd(newLessons as ClassLesson[]);
      onGenerated?.();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to generate lessons from timetable.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Populate Lessons from Weekly Timetable"
      description={`Automatically create sequential lesson milestone dates matching ${teacherClass.name}'s scheduled class periods.`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Timetable Schedule Summary */}
        {!schedules || schedules.length === 0 ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              No Weekly Timetable Schedules Found for This Class
            </div>
            <p className="text-muted-foreground text-[11px]">
              Please configure weekly timetable periods in the <strong>Lesson Timetable</strong> tab first (e.g. Mondays 09:00, Wednesdays 11:15) so dates can be automatically picked up.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Arranged Weekly Timetable Periods:
            </div>
            <div className="flex flex-wrap gap-2">
              {schedules.map((s) => (
                <span
                  key={s.id}
                  className="px-2.5 py-1 rounded-lg bg-card text-foreground border text-xs font-semibold shadow-2xs flex items-center gap-1.5"
                >
                  <span className="capitalize text-primary font-bold">
                    {s.dayOfWeek}:
                  </span>
                  <span>
                    {s.startTime} – {s.endTime}
                  </span>
                  {s.room && (
                    <span className="text-muted-foreground font-normal text-[11px]">
                      ({s.room})
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Generation Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Input
              label="Starting Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              label="Lesson Count"
              type="number"
              min={1}
              max={60}
              value={slotCount}
              onChange={(e) => setSlotCount(Number(e.target.value))}
            />
          </div>

          <div>
            <Input
              label="Title Prefix"
              placeholder="e.g. Lesson, Topic"
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Unit / Topic (Optional)"
              placeholder="e.g. Unit 1: Basics"
              value={unitOrTopic}
              onChange={(e) => setUnitOrTopic(e.target.value)}
            />
          </div>
        </div>

        {/* Preview of Calculated Timetable Dates */}
        {previewSlots.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Preview of Next {previewSlots.length} Lesson Dates:
              </span>
              <span className="text-muted-foreground text-[11px]">
                {existingLessons.length} already planned • Lessons #{existingLessons.length + 1} to #{existingLessons.length + previewSlots.length}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border divide-y bg-muted/20 text-xs">
              {previewSlots.map((slot, i) => {
                const lessonNum = existingLessons.length + i + 1;
                return (
                  <div
                    key={i}
                    className="p-2.5 px-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {lessonNum}
                      </span>
                      <div>
                        <span className="font-bold text-foreground">
                          {slot.formattedDate}
                        </span>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {slot.startTime} – {slot.endTime}
                          </span>
                          {slot.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              Room: {slot.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Planned
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || previewSlots.length === 0}
            className="gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating
              ? "Generating..."
              : `Create ${previewSlots.length} Timetable Lessons`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
