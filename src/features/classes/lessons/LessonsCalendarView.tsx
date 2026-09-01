import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { formatLocalDateString } from "@/lib/timetableSlotGenerator";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileCheck,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Play,
} from "lucide-react";
import type { TeacherClass, ClassLesson, ClassSchedule, DayOfWeek } from "@/types/database";

interface LessonsCalendarViewProps {
  classId: number;
  teacherClass: TeacherClass;
  lessons: ClassLesson[];
  schedules?: ClassSchedule[];
  onSelectLesson: (lesson: ClassLesson) => void;
  onAddLessonForDate: (dateStr: string) => void;
  onCycleStatus: (lesson: ClassLesson) => void;
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_INDEX_MAP: Record<number, DayOfWeek> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function LessonsCalendarView({
  teacherClass: _teacherClass,
  lessons,
  schedules = [],
  onSelectLesson,
  onAddLessonForDate,
  onCycleStatus,
}: LessonsCalendarViewProps) {
  // Calendar current viewed month/year (defaults to current month or first lesson month)
  const initialDate = useMemo(() => {
    if (lessons.length > 0) {
      const sortedDates = lessons
        .map((l) => l.lessonDate)
        .filter(Boolean) as string[];
      sortedDates.sort();
      if (sortedDates.length > 0) {
        const parts = sortedDates[0].split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    return new Date();
  }, [lessons]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-11

  // Today string for highlighting
  const todayStr = useMemo(() => formatLocalDateString(new Date()), []);

  // Map lessons by YYYY-MM-DD
  const lessonsByDate = useMemo(() => {
    const map = new Map<string, ClassLesson[]>();
    for (const l of lessons) {
      if (l.lessonDate) {
        if (!map.has(l.lessonDate)) {
          map.set(l.lessonDate, []);
        }
        map.get(l.lessonDate)!.push(l);
      }
    }
    return map;
  }, [lessons]);

  // Group class schedules by dayOfWeek
  const schedulesByDay = useMemo(() => {
    const map = new Map<DayOfWeek, ClassSchedule[]>();
    for (const s of schedules) {
      const key = s.dayOfWeek.toLowerCase() as DayOfWeek;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [schedules]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Month Title Formatter (e.g. "September 2026")
  const monthTitle = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [currentYear, currentMonth]);

  // Generate calendar grid cells (Monday-based start)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    // In JS, 0 = Sunday, 1 = Monday... We want Monday = 0, Sunday = 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: DayOfWeek;
      isWeekend: boolean;
    }> = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatLocalDateString(prevDate);
      const dayOfWeek = DAY_INDEX_MAP[prevDate.getDay()];
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek,
        isWeekend: dayOfWeek === "saturday" || dayOfWeek === "sunday",
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const curDate = new Date(currentYear, currentMonth, dayNum);
      const dateStr = formatLocalDateString(curDate);
      const dayOfWeek = DAY_INDEX_MAP[curDate.getDay()];
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        dayOfWeek,
        isWeekend: dayOfWeek === "saturday" || dayOfWeek === "sunday",
      });
    }

    // Next month filler days (fill up to multiple of 7, min 35 cells)
    const totalCellsNeeded = Math.ceil(cells.length / 7) * 7;
    let nextDayNum = 1;
    while (cells.length < totalCellsNeeded) {
      const nextDate = new Date(currentYear, currentMonth + 1, nextDayNum);
      const dateStr = formatLocalDateString(nextDate);
      const dayOfWeek = DAY_INDEX_MAP[nextDate.getDay()];
      cells.push({
        dateStr,
        dayNumber: nextDayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek,
        isWeekend: dayOfWeek === "saturday" || dayOfWeek === "sunday",
      });
      nextDayNum++;
    }

    return cells;
  }, [currentYear, currentMonth, todayStr]);

  return (
    <div className="space-y-4">
      {/* Calendar Header Navigation */}
      <div className="p-4 rounded-2xl bg-card border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground capitalize">
              {monthTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              Click on any lesson card or timetable slot to manage curriculum delivery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs font-semibold"
          >
            Today
          </Button>

          <div className="flex items-center rounded-xl border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center font-bold text-xs text-muted-foreground py-2.5">
          {WEEKDAY_NAMES.map((name, i) => (
            <div
              key={name}
              className={i >= 5 ? "text-muted-foreground/60" : "text-foreground/80"}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y border-b">
          {calendarCells.map((cell) => {
            const dayLessons = lessonsByDate.get(cell.dateStr) || [];
            const daySchedules = schedulesByDay.get(cell.dayOfWeek) || [];
            const hasTimetable = cell.isCurrentMonth && daySchedules.length > 0;

            return (
              <div
                key={cell.dateStr}
                className={`min-h-[115px] sm:min-h-[135px] p-2 flex flex-col justify-between transition-colors relative group ${
                  !cell.isCurrentMonth
                    ? "bg-muted/15 text-muted-foreground/50"
                    : cell.isWeekend
                    ? "bg-muted/5 text-muted-foreground/80"
                    : "bg-card hover:bg-muted/10"
                }`}
              >
                {/* Cell Header: Day Number & Timetable Badge */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Weekly Timetable Period Indicator */}
                    {hasTimetable && dayLessons.length === 0 && (
                      <span
                        className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold"
                        title={`Class Timetable: ${daySchedules.map((s) => `${s.startTime}-${s.endTime}`).join(", ")}`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {daySchedules[0].startTime}
                      </span>
                    )}
                  </div>

                  {/* Quick Add Button on Hover */}
                  {cell.isCurrentMonth && (
                    <button
                      type="button"
                      onClick={() => onAddLessonForDate(cell.dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                      title={`Plan lesson on ${cell.dateStr}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Day's Lessons Container */}
                <div className="space-y-1.5 my-1 flex-1">
                  {dayLessons.map((lesson) => {
                    const isCompleted = lesson.status === "completed";
                    const isInProgress = lesson.status === "in_progress";

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson)}
                        className={`p-1.5 sm:p-2 rounded-xl border text-xs cursor-pointer transition-all shadow-2xs hover:shadow-xs ${
                          isCompleted
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200 hover:border-emerald-500/60"
                            : isInProgress
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200 hover:border-amber-500/70"
                            : "bg-card border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {/* Status Icon & Lesson Title */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-1 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCycleStatus(lesson);
                              }}
                              title={`Status: ${lesson.status} (Click to advance)`}
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-transform hover:scale-110 cursor-pointer ${
                                isCompleted
                                  ? "bg-emerald-500 text-white"
                                  : isInProgress
                                  ? "bg-amber-500 text-white"
                                  : "bg-muted text-muted-foreground border"
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : isInProgress ? (
                                <Play className="w-2 h-2 fill-current ml-0.5" />
                              ) : (
                                <span className="text-[9px] font-bold">
                                  {lesson.lessonNumber}
                                </span>
                              )}
                            </button>

                            <span className="font-bold text-[11px] leading-tight truncate">
                              {lesson.title}
                            </span>
                          </div>
                        </div>

                        {/* Homework Chip if present */}
                        {lesson.assignmentTitle && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 font-semibold truncate bg-purple-500/10 px-1.5 py-0.5 rounded">
                            <FileCheck className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{lesson.assignmentTitle}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Helper for empty timetable days */}
                {dayLessons.length === 0 && hasTimetable && (
                  <button
                    type="button"
                    onClick={() => onAddLessonForDate(cell.dateStr)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-0.5 pt-0.5 opacity-70 group-hover:opacity-100 cursor-pointer"
                  >
                    <span>+ Schedule Lesson</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Legend */}
        <div className="p-3 bg-muted/20 border-t flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-foreground">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Completed Lesson</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>Planned Lesson</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-purple-500" />
              <span>Homework Assigned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Arranged Timetable Slot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
