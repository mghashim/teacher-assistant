import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { schedulesRepository } from "@/db/repositories/schedules.repository";
import {
  DEFAULT_ACADEMIC_YEAR,
  SETTING_KEYS,
} from "@/db/repositories/settings.repository";
import { notificationService } from "@/services/notification.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ClassScheduleModal } from "@/features/classes/ClassScheduleModal";
import { LessonReminderModal } from "./LessonReminderModal";
import { AcademicYearModal } from "./AcademicYearModal";
import { getDayOfWeekFromDate, sortSchedulesByTime } from "@/lib/calculations";
import { getMonthCalendarGrid, formatMonthName } from "@/lib/calendarUtils";
import { formatDate } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit2,
  Trash2,
  Printer,
  GraduationCap,
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListOrdered,
  CalendarDays,
  Palmtree,
  CalendarRange,
} from "lucide-react";
import type {
  ClassSchedule,
  DayOfWeek,
  TeacherClass,
  AcademicYearConfig,
  SchoolHoliday,
} from "@/types/database";

const ALL_DAYS: Array<{ id: DayOfWeek; name: string; short: string }> = [
  { id: "monday", name: "Monday", short: "Mon" },
  { id: "tuesday", name: "Tuesday", short: "Tue" },
  { id: "wednesday", name: "Wednesday", short: "Wed" },
  { id: "thursday", name: "Thursday", short: "Thu" },
  { id: "friday", name: "Friday", short: "Fri" },
  { id: "saturday", name: "Saturday", short: "Sat" },
  { id: "sunday", name: "Sunday", short: "Sun" },
];

export function TimetablePage() {
  const [viewMode, setViewMode] = useState<"calendar" | "week" | "agenda">("calendar");
  const [showWeekends, setShowWeekends] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
  const [agendaDay, setAgendaDay] = useState<DayOfWeek>("monday");

  // Calendar Month State (year, month: 0-11)
  const todayDate = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayDate.getMonth());

  // Selected date popup in calendar
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<{
    dateStr: string;
    dayOfWeek: DayOfWeek;
    formattedDate: string;
    isOutsideYear: boolean;
    holiday?: SchoolHoliday;
  } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDefaultDay, setAddDefaultDay] = useState<DayOfWeek | undefined>(undefined);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ClassSchedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isAcademicYearModalOpen, setIsAcademicYearModalOpen] = useState(false);

  // Live queries
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);
  const schedules = useLiveQuery(() => db.classSchedules.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const academicYearSetting = useLiveQuery(
    () => db.settings.get(SETTING_KEYS.ACADEMIC_YEAR),
    []
  );

  const academicConfig: AcademicYearConfig = useMemo(() => {
    if (academicYearSetting && academicYearSetting.value) {
      return academicYearSetting.value as AcademicYearConfig;
    }
    return DEFAULT_ACADEMIC_YEAR;
  }, [academicYearSetting]);

  const todayDayOfWeek = useMemo(() => getDayOfWeekFromDate(new Date()), []);
  const reminderSettings = notificationService.getSettings();

  const classMap = useMemo(() => {
    const map = new Map<number, TeacherClass>();
    classes?.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [classes]);

  const studentCountByClass = useMemo(() => {
    const map = new Map<number, number>();
    students?.forEach((s) => {
      map.set(s.classId, (map.get(s.classId) || 0) + 1);
    });
    return map;
  }, [students]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (selectedClassId === "all") return schedules;
    return schedules.filter((s) => s.classId === selectedClassId);
  }, [schedules, selectedClassId]);

  // Group schedules by day of week
  const schedulesByDay = useMemo(() => {
    const map: Record<DayOfWeek, ClassSchedule[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    filteredSchedules.forEach((s) => {
      if (map[s.dayOfWeek]) {
        map[s.dayOfWeek].push(s);
      }
    });

    Object.keys(map).forEach((day) => {
      map[day as DayOfWeek] = sortSchedulesByTime(map[day as DayOfWeek]);
    });

    return map;
  }, [filteredSchedules]);

  // Monthly Calendar Grid calculation
  const monthCalendarGrid = useMemo(() => {
    return getMonthCalendarGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Helper: check if a date is outside active academic year
  const isDateOutsideAcademicYear = (dateStr: string) => {
    if (academicConfig.startDate && dateStr < academicConfig.startDate) return true;
    if (academicConfig.endDate && dateStr > academicConfig.endDate) return true;
    return false;
  };

  // Helper: check if a date falls in a custom holiday
  const getHolidayForDate = (dateStr: string): SchoolHoliday | undefined => {
    if (!academicConfig.holidays) return undefined;
    return academicConfig.holidays.find(
      (h) => dateStr >= h.startDate && dateStr <= h.endDate
    );
  };

  // Calculate total teaching time in minutes
  const totalWeeklyMinutes = useMemo(() => {
    let total = 0;
    filteredSchedules.forEach((s) => {
      const [startH, startM] = s.startTime.split(":").map(Number);
      const [endH, endM] = s.endTime.split(":").map(Number);
      if (!isNaN(startH) && !isNaN(endH)) {
        const duration = endH * 60 + endM - (startH * 60 + startM);
        if (duration > 0) total += duration;
      }
    });
    return total;
  }, [filteredSchedules]);

  const totalTeachingHoursFormatted = useMemo(() => {
    const hours = Math.floor(totalWeeklyMinutes / 60);
    const mins = totalWeeklyMinutes % 60;
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hrs`;
    return `${hours} hrs ${mins} mins`;
  }, [totalWeeklyMinutes]);

  const activeDays = useMemo(() => {
    if (showWeekends) return ALL_DAYS;
    return ALL_DAYS.slice(0, 5); // Monday to Friday
  }, [showWeekends]);

  const todaysLessons = schedulesByDay[todayDayOfWeek as DayOfWeek] || [];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  };

  const handleOpenAddForDay = (day: DayOfWeek) => {
    setAddDefaultDay(day);
    setEditingSchedule(null);
    setIsAddModalOpen(true);
  };

  const handleOpenAddGeneral = () => {
    setAddDefaultDay(undefined);
    setEditingSchedule(null);
    setIsAddModalOpen(true);
  };

  const handleDeleteScheduleConfirm = async () => {
    if (!deletingSchedule?.id) return;
    setIsDeleting(true);
    try {
      await schedulesRepository.delete(deletingSchedule.id);
      setDeletingSchedule(null);
    } catch (err) {
      alert("Failed to delete lesson: " + (err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span>My Teaching Timetable & Calendar</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Term planner ({academicConfig.name || "Academic Year"}) with customized holidays and lesson reminders.
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) =>
              setSelectedClassId(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="h-9 px-3 rounded-lg border border-input bg-card text-xs font-medium text-foreground focus:ring-1 focus:ring-ring focus:outline-none"
          >
            <option value="all">All Classes ({classes?.length || 0})</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg border bg-muted/40 text-xs">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "calendar"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => setViewMode("week")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "week"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Week Grid</span>
            </button>

            <button
              onClick={() => {
                setViewMode("agenda");
                setAgendaDay(todayDayOfWeek as DayOfWeek);
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "agenda"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Daily Agenda</span>
            </button>
          </div>

          {/* Academic Year & Holidays Config Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAcademicYearModalOpen(true)}
            className="gap-1.5 text-xs h-9"
            title="Configure Academic Year Dates & Custom Holidays"
          >
            <CalendarRange className="w-3.5 h-3.5 text-indigo-500" />
            <span>Term Dates & Holidays</span>
          </Button>

          {/* Reminders Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReminderModalOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <Bell className={`w-3.5 h-3.5 ${reminderSettings.enabled ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground"}`} />
            <span>Reminders</span>
            {reminderSettings.enabled && (
              <Badge variant="default" className="text-[9px] px-1 h-3.5 ml-0.5">
                ON
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs h-9"
            title="Print timetable"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Print</span>
          </Button>

          <Button
            onClick={handleOpenAddGeneral}
            size="sm"
            className="gap-1.5 text-xs h-9 font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lesson Slot</span>
          </Button>
        </div>
      </div>

      {/* Stats & Today Highlight Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Weekly Teaching Load
              </span>
              <div className="text-xl font-bold text-foreground">
                {filteredSchedules.length} Lessons ({totalTeachingHoursFormatted})
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {academicConfig.name || "Academic Year"}
              </span>
              <div className="text-xl font-bold text-foreground">
                {todaysLessons.length} Lesson{todaysLessons.length === 1 ? "" : "s"} Today
              </div>
              <span className="text-[11px] text-muted-foreground block font-mono">
                Term: {formatDate(academicConfig.startDate)} → {formatDate(academicConfig.endDate)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <CalendarRange className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Classroom Groups
              </span>
              <div className="text-xl font-bold text-foreground">
                {classes?.length || 0} Classes ({students?.length || 0} Pupils)
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VIEW 1: FULL CALENDAR VIEW (With Month, Dates, Academic Year Bounds & Holidays) */}
      {viewMode === "calendar" && (
        <div className="space-y-4">
          {/* Calendar Header with Navigation */}
          <div className="p-4 rounded-2xl border bg-card flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span>{formatMonthName(currentYear, currentMonth)}</span>
              </h2>

              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpToToday}
                className="text-xs h-7 px-2.5 font-medium"
              >
                Today
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {/* Legend Badges */}
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary"></span> Term Session
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> School Holiday
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40"></span> Outside Term
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 p-0"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-8 w-8 p-0"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Month Calendar 7-Column Grid */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b bg-muted/60 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-2.5">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div className="text-muted-foreground/70">Sat</div>
              <div className="text-muted-foreground/70">Sun</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
              {monthCalendarGrid.map((calDay, idx) => {
                const isOutsideYear = isDateOutsideAcademicYear(calDay.dateString);
                const holiday = getHolidayForDate(calDay.dateString);
                const dayLessons = (!isOutsideYear && !holiday)
                  ? (schedulesByDay[calDay.dayOfWeek] || [])
                  : [];

                return (
                  <div
                    key={idx}
                    onClick={() =>
                      setSelectedCalendarDate({
                        dateStr: calDay.dateString,
                        dayOfWeek: calDay.dayOfWeek,
                        formattedDate: calDay.date.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }),
                        isOutsideYear,
                        holiday,
                      })
                    }
                    className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                      !calDay.isCurrentMonth
                        ? "bg-muted/15 text-muted-foreground/35"
                        : isOutsideYear
                        ? "bg-muted/30 text-muted-foreground/60"
                        : holiday
                        ? "bg-amber-50/40 dark:bg-amber-950/20"
                        : "bg-card hover:bg-muted/30"
                    } ${
                      calDay.isToday
                        ? "ring-2 ring-primary/40 bg-primary/5 font-semibold"
                        : ""
                    }`}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          calDay.isToday
                            ? "bg-primary text-primary-foreground font-extrabold"
                            : "text-foreground"
                        }`}
                      >
                        {calDay.dayNumber}
                      </span>

                      {/* Status Tags */}
                      {isOutsideYear ? (
                        <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground font-medium">
                          Out of Term
                        </span>
                      ) : holiday ? (
                        <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold truncate max-w-[75px]">
                          {holiday.name}
                        </span>
                      ) : dayLessons.length > 0 ? (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {dayLessons.length} class{dayLessons.length === 1 ? "" : "es"}
                        </span>
                      ) : null}
                    </div>

                    {/* Cell Content: Lessons OR Holiday Banner OR Out-of-Term notice */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {isOutsideYear ? (
                        <div className="py-2 text-[10px] text-muted-foreground/60 italic text-center">
                          Academic year ended
                        </div>
                      ) : holiday ? (
                        <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] flex items-center gap-1 font-medium">
                          <Palmtree className="w-3 h-3 shrink-0 text-amber-500" />
                          <span className="truncate">{holiday.name}</span>
                        </div>
                      ) : (
                        <>
                          {dayLessons.slice(0, 2).map((lesson) => {
                            const tClass = classMap.get(lesson.classId);
                            return (
                              <div
                                key={lesson.id}
                                className="p-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[10px] leading-tight text-foreground truncate flex items-center justify-between gap-1 transition-colors"
                                title={`${lesson.startTime}-${lesson.endTime}: ${tClass?.name || "Class"} (${lesson.room || "No room"})`}
                              >
                                <span className="font-mono font-bold text-primary shrink-0">
                                  {lesson.startTime}
                                </span>
                                <span className="font-semibold truncate">
                                  {tClass?.name || "Class"}
                                </span>
                              </div>
                            );
                          })}

                          {dayLessons.length > 2 && (
                            <div className="text-[10px] font-semibold text-primary/80 pl-1">
                              +{dayLessons.length - 2} more
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity text-right">
                      Click to view
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK GRID */}
      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 print:hidden">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showWeekends}
                onChange={(e) => setShowWeekends(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Include weekend slots (Saturday & Sunday)</span>
            </label>

            <span>Sorted chronologically by start time</span>
          </div>

          <div
            className={`grid grid-cols-1 ${
              showWeekends ? "md:grid-cols-7" : "md:grid-cols-5"
            } gap-3.5 items-start`}
          >
            {activeDays.map((day) => {
              const isToday = day.id === todayDayOfWeek;
              const daySchedules = schedulesByDay[day.id] || [];

              return (
                <div
                  key={day.id}
                  className={`rounded-xl border flex flex-col transition-all bg-card/60 ${
                    isToday
                      ? "border-primary ring-2 ring-primary/20 shadow-sm bg-card"
                      : "border-border"
                  }`}
                >
                  {/* Day Header */}
                  <div
                    className={`p-3 border-b flex items-center justify-between rounded-t-xl ${
                      isToday
                        ? "bg-primary/10 text-primary font-bold"
                        : "bg-muted/40 text-foreground font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-sm tracking-tight">
                        {day.name}
                      </span>
                      {isToday && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                          Today
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground font-medium">
                      {daySchedules.length}
                    </span>
                  </div>

                  {/* Day Lessons List */}
                  <div className="p-2.5 space-y-2.5 min-h-[160px]">
                    {daySchedules.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground/80 space-y-2">
                        <p className="italic">No lessons scheduled</p>
                        <button
                          type="button"
                          onClick={() => handleOpenAddForDay(day.id)}
                          className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Lesson
                        </button>
                      </div>
                    ) : (
                      daySchedules.map((schedule) => {
                        const teacherClass = classMap.get(schedule.classId);
                        const pupilCount = studentCountByClass.get(schedule.classId) || 0;

                        return (
                          <div
                            key={schedule.id}
                            className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-all hover:shadow-xs space-y-2 relative group"
                          >
                            {/* Time badge and controls */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {schedule.startTime} – {schedule.endTime}
                                </span>
                              </span>

                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSchedule(schedule);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                                  title="Edit schedule slot"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingSchedule(schedule)}
                                  className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10"
                                  title="Delete schedule slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Class Name */}
                            <div>
                              <Link
                                to={`/classes/${schedule.classId}`}
                                className="font-bold text-xs text-foreground hover:text-primary transition-colors line-clamp-1"
                                title={teacherClass?.name || "Class"}
                              >
                                {teacherClass?.name || "Class"}
                              </Link>

                              {teacherClass?.subject && (
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {teacherClass.subject}
                                </span>
                              )}
                            </div>

                            {/* Room & Pupil count metadata */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                              {schedule.room ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted font-medium text-foreground">
                                  <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                                  <span>{schedule.room}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">No room set</span>
                              )}

                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/60">
                                <Users className="w-2.5 h-2.5 text-blue-500" />
                                <span>{pupilCount} pupils</span>
                              </span>
                            </div>

                            {/* Notes */}
                            {schedule.notes && (
                              <p className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded border border-border/50 line-clamp-2">
                                {schedule.notes}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Add button at bottom of day column */}
                    {daySchedules.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddForDay(day.id)}
                        className="w-full py-1.5 text-center text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-center gap-1 border border-dashed border-border"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Slot</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: DAILY AGENDA LIST */}
      {viewMode === "agenda" && (
        <div className="space-y-4">
          {/* Day Selector Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-card border">
            {activeDays.map((day) => {
              const isSelected = day.id === agendaDay;
              const isToday = day.id === todayDayOfWeek;
              const count = (schedulesByDay[day.id] || []).length;

              return (
                <button
                  key={day.id}
                  onClick={() => setAgendaDay(day.id)}
                  className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {day.name}
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    )}
                  </span>
                  <span className="text-[10px] font-normal opacity-80">
                    {count} lesson{count === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Agenda items for selected day */}
          <div className="space-y-3">
            {(schedulesByDay[agendaDay] || []).length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title={`No lessons scheduled for ${agendaDay.charAt(0).toUpperCase() + agendaDay.slice(1)}`}
                description="Click below to add a scheduled lesson time for this day."
                actionLabel={`Add Lesson for ${agendaDay.charAt(0).toUpperCase() + agendaDay.slice(1)}`}
                onAction={() => handleOpenAddForDay(agendaDay)}
              />
            ) : (
              <div className="space-y-2.5">
                {(schedulesByDay[agendaDay] || []).map((schedule, idx) => {
                  const teacherClass = classMap.get(schedule.classId);
                  const pupilCount = studentCountByClass.get(schedule.classId) || 0;

                  return (
                    <div
                      key={schedule.id}
                      className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary font-mono text-center shrink-0 min-w-[85px]">
                          <span className="text-xs font-bold block">Period #{idx + 1}</span>
                          <span className="text-[11px] font-medium block opacity-90 mt-0.5">
                            {schedule.startTime}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/classes/${schedule.classId}`}
                              className="text-base font-bold text-foreground hover:text-primary transition-colors"
                            >
                              {teacherClass?.name || "Class"}
                            </Link>
                            {teacherClass?.subject && (
                              <Badge variant="secondary" className="text-[11px]">
                                {teacherClass.subject}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono font-semibold text-foreground">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              {schedule.startTime} – {schedule.endTime}
                            </span>
                            {schedule.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                {schedule.room}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-blue-500" />
                              {pupilCount} enrolled pupils
                            </span>
                          </div>

                          {schedule.notes && (
                            <p className="text-xs text-muted-foreground pt-1 italic">
                              "{schedule.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setIsAddModalOpen(true);
                          }}
                          className="h-8 text-xs gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingSchedule(schedule)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Calendar Date Detail Modal */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {selectedCalendarDate.formattedDate}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedCalendarDate.isOutsideYear
                    ? "Outside Active School Year"
                    : selectedCalendarDate.holiday
                    ? `School Holiday (${selectedCalendarDate.holiday.name})`
                    : `Scheduled classes for ${selectedCalendarDate.dayOfWeek.toUpperCase()}`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCalendarDate(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto">
              {selectedCalendarDate.isOutsideYear ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed space-y-2">
                  <CalendarRange className="w-8 h-8 mx-auto text-muted-foreground/60" />
                  <p className="font-semibold text-foreground">
                    This date is outside the {academicConfig.name} period.
                  </p>
                  <p>
                    Term dates run from {formatDate(academicConfig.startDate)} to {formatDate(academicConfig.endDate)}.
                  </p>
                </div>
              ) : selectedCalendarDate.holiday ? (
                <div className="p-6 text-center text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                  <Palmtree className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="font-bold text-sm">
                    {selectedCalendarDate.holiday.name}
                  </p>
                  <p>
                    School is on holiday break from {formatDate(selectedCalendarDate.holiday.startDate)} to {formatDate(selectedCalendarDate.holiday.endDate)}. No lessons scheduled.
                  </p>
                </div>
              ) : (schedulesByDay[selectedCalendarDate.dayOfWeek] || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  No classes scheduled on this day.
                </p>
              ) : (
                (schedulesByDay[selectedCalendarDate.dayOfWeek] || []).map((s) => {
                  const tClass = classMap.get(s.classId);
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-foreground">
                          {tClass?.name || "Class"}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-primary" />
                          <span>
                            {s.startTime} – {s.endTime}
                          </span>
                          {s.room && (
                            <span className="text-foreground font-sans">
                              • {s.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/classes/${s.classId}`}
                        className="text-primary font-semibold hover:underline text-xs"
                        onClick={() => setSelectedCalendarDate(null)}
                      >
                        Open Class
                      </Link>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleOpenAddForDay(selectedCalendarDate.dayOfWeek);
                  setSelectedCalendarDate(null);
                }}
                className="gap-1 text-xs"
              >
                <Plus className="w-3 h-3" /> Add Lesson to this day
              </Button>

              <Button
                size="sm"
                onClick={() => setSelectedCalendarDate(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Lesson Schedule Modal */}
      <ClassScheduleModal
        isOpen={isAddModalOpen || editingSchedule !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSchedule(null);
          setAddDefaultDay(undefined);
        }}
        defaultDayOfWeek={addDefaultDay}
        initialData={editingSchedule}
      />

      {/* Lesson Reminder Settings Modal */}
      <LessonReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />

      {/* Academic Year & Custom Holidays Modal */}
      <AcademicYearModal
        isOpen={isAcademicYearModalOpen}
        onClose={() => setIsAcademicYearModalOpen(false)}
      />

      {/* Password Protected Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingSchedule !== null}
        onClose={() => setDeletingSchedule(null)}
        onConfirm={handleDeleteScheduleConfirm}
        title="Delete Lesson Time Slot?"
        message={`Are you sure you want to remove ${deletingSchedule?.dayOfWeek.toUpperCase()} (${deletingSchedule?.startTime}–${deletingSchedule?.endTime}) from your teaching schedule?`}
        confirmText="Delete Lesson Slot"
        variant="destructive"
        requirePassword={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
