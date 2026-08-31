import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { schedulesRepository } from "@/db/repositories/schedules.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ClassScheduleModal } from "@/features/classes/ClassScheduleModal";
import { getDayOfWeekFromDate, sortSchedulesByTime } from "@/lib/calculations";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit2,
  Trash2,
  Printer,
  GraduationCap,
} from "lucide-react";
import type { ClassSchedule, DayOfWeek, TeacherClass } from "@/types/database";

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
  const [showWeekends, setShowWeekends] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");
  const [agendaDay, setAgendaDay] = useState<DayOfWeek>("monday");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDefaultDay, setAddDefaultDay] = useState<DayOfWeek | undefined>(undefined);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ClassSchedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live queries
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);
  const schedules = useLiveQuery(() => db.classSchedules.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);

  const todayDayOfWeek = useMemo(() => getDayOfWeekFromDate(new Date()), []);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-primary" />
            <span>My Teaching Timetable</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Weekly lesson planner and classroom schedule organized by your class times.
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

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-lg border bg-muted/40 text-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Week Grid
            </button>
            <button
              onClick={() => {
                setViewMode("agenda");
                setAgendaDay(todayDayOfWeek as DayOfWeek);
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "agenda"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily Agenda
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-9"
            title="Print weekly timetable"
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
                Today's Schedule ({todayDayOfWeek.toUpperCase()})
              </span>
              <div className="text-xl font-bold text-foreground">
                {todaysLessons.length} Scheduled Lesson{todaysLessons.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-5 h-5" />
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
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekends Toggle */}
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

        <span>Sorted chronologically by lesson start time</span>
      </div>

      {/* Main View: Week Grid */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start">
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
      )}

      {/* Alternate View: Daily Agenda List */}
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
                icon={Calendar}
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
