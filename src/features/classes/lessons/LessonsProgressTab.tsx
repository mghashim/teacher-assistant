import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { lessonsRepository } from "@/db/repositories/lessons.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { LessonModal } from "./LessonModal";
import { GenerateLessonsModal } from "./GenerateLessonsModal";
import { LessonsCalendarView } from "./LessonsCalendarView";
import { formatDateWithDay } from "@/lib/utils";
import { findMatchingTimetableSchedule } from "@/lib/timetableSlotGenerator";
import {
  Calendar as CalendarIcon,
  Map,
  ListFilter,
  Plus,
  FileCheck,
  Edit2,
  Trash2,
  Calendar,
  Search,
  Check,
  Play,
  Sparkles,
  Clock,
  MapPin,
} from "lucide-react";
import type { TeacherClass, ClassLesson, LessonStatus } from "@/types/database";

interface LessonsProgressTabProps {
  classId: number;
  teacherClass: TeacherClass;
}

export function LessonsProgressTab({
  classId,
  teacherClass,
}: LessonsProgressTabProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "map" | "table">("calendar");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined);
  const [editingLesson, setEditingLesson] = useState<ClassLesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<ClassLesson | null>(null);

  // Live query for lessons in this class
  const lessons = useLiveQuery(
    () => db.lessons.where("classId").equals(classId).sortBy("orderIndex"),
    [classId]
  );

  // Live query for weekly timetable schedules of this class
  const schedules = useLiveQuery(
    () => db.classSchedules.where("classId").equals(classId).toArray(),
    [classId]
  );

  // Derive unique unit/topic names
  const units = useMemo(() => {
    if (!lessons) return [];
    const set = new Set<string>();
    lessons.forEach((l) => {
      if (l.unitOrTopic?.trim()) {
        set.add(l.unitOrTopic.trim());
      }
    });
    return Array.from(set);
  }, [lessons]);

  // Filter lessons
  const filteredLessons = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((lesson) => {
      if (statusFilter !== "all" && lesson.status !== statusFilter) {
        return false;
      }
      if (selectedUnit !== "all" && lesson.unitOrTopic !== selectedUnit) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = lesson.title.toLowerCase().includes(q);
        const unitMatch = (lesson.unitOrTopic || "").toLowerCase().includes(q);
        const assignmentMatch = (lesson.assignmentTitle || "")
          .toLowerCase()
          .includes(q);
        const objMatch = (lesson.learningObjectives || "").toLowerCase().includes(q);
        if (!titleMatch && !unitMatch && !assignmentMatch && !objMatch) {
          return false;
        }
      }
      return true;
    });
  }, [lessons, statusFilter, selectedUnit, searchQuery]);

  // Progress metrics calculation
  const metrics = useMemo(() => {
    const total = lessons?.length || 0;
    const completed = lessons?.filter((l) => l.status === "completed").length || 0;
    const inProgress =
      lessons?.filter((l) => l.status === "in_progress").length || 0;
    const planned = lessons?.filter((l) => l.status === "planned").length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      planned,
      percentage,
    };
  }, [lessons]);

  // Cycle status 1-click helper: planned -> in_progress -> completed -> planned
  const handleCycleStatus = async (lesson: ClassLesson) => {
    if (!lesson.id) return;
    let nextStatus: LessonStatus = "in_progress";
    if (lesson.status === "planned") nextStatus = "in_progress";
    else if (lesson.status === "in_progress") nextStatus = "completed";
    else if (lesson.status === "completed") nextStatus = "planned";
    else nextStatus = "planned";

    try {
      await lessonsRepository.updateStatus(lesson.id, nextStatus);
    } catch (err) {
      alert("Failed to update status: " + (err as Error).message);
    }
  };

  const handleAddForDate = (dateStr: string) => {
    setPreselectedDate(dateStr);
    setEditingLesson(null);
    setIsCreateModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLesson?.id) return;
    try {
      await lessonsRepository.delete(deletingLesson.id);
      setDeletingLesson(null);
    } catch (err) {
      alert("Failed to delete lesson: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            Lessons Progress & Calendar
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Curriculum milestone calendar and homework aligned with {teacherClass.name}'s weekly timetable.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* 3-Way View Switcher: Calendar, Roadmap Map, Timeline */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" /> Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "map"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="w-3.5 h-3.5 text-primary" /> Roadmap
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>

          {/* Populate from Timetable Button */}
          {schedules && schedules.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateModalOpen(true)}
              className="gap-1.5 shadow-2xs shrink-0"
              title="Auto-create lesson milestone slots for the term from arranged timetable"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="hidden md:inline">Populate from Timetable</span>
              <span className="md:hidden">From Timetable</span>
            </Button>
          )}

          <Button
            onClick={() => {
              setPreselectedDate(undefined);
              setIsCreateModalOpen(true);
            }}
            size="sm"
            className="gap-1.5 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Lesson
          </Button>
        </div>
      </div>

      {/* Clean Progress & Filter Strip */}
      <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-3.5">
        {/* Progress bar with percentage */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Curriculum Completion:
            </span>
            <span className="text-xs font-extrabold text-primary">
              {metrics.percentage}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({metrics.completed} of {metrics.total} delivered)
            </span>
          </div>

          {/* Quick status counters */}
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {metrics.completed} Completed
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {metrics.inProgress} In Progress
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              {metrics.planned} Planned
            </span>
          </div>
        </div>

        {/* Minimalist Progress track */}
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-500 ease-out"
            style={{
              width: `${
                metrics.total > 0
                  ? (metrics.completed / metrics.total) * 100
                  : 0
              }%`,
            }}
          />
          <div
            className="bg-amber-500 transition-all duration-500 ease-out"
            style={{
              width: `${
                metrics.total > 0
                  ? (metrics.inProgress / metrics.total) * 100
                  : 0
              }%`,
            }}
          />
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search lessons, topics, or homework..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border bg-background text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border bg-background text-xs font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">🟢 Completed</option>
              <option value="in_progress">🟡 In Progress</option>
              <option value="planned">⚪ Planned</option>
              <option value="skipped">⚪ Skipped</option>
            </select>

            {units.length > 0 && (
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="px-3 py-1.5 rounded-xl border bg-background text-xs font-medium focus:outline-hidden max-w-[180px] truncate cursor-pointer"
              >
                <option value="all">All Units / Topics</option>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!lessons || lessons.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No lessons in curriculum roadmap yet"
          description="Plan your lessons and homework milestones, or auto-populate lesson dates directly from your weekly timetable schedule."
          actionLabel={schedules && schedules.length > 0 ? "Populate from Timetable" : "Add First Lesson"}
          onAction={() => {
            if (schedules && schedules.length > 0) {
              setIsGenerateModalOpen(true);
            } else {
              setPreselectedDate(undefined);
              setIsCreateModalOpen(true);
            }
          }}
        />
      ) : viewMode === "calendar" ? (
        /* CALENDAR MONTH VIEW */
        <LessonsCalendarView
          classId={classId}
          teacherClass={teacherClass}
          lessons={filteredLessons}
          schedules={schedules || []}
          onSelectLesson={(lesson) => setEditingLesson(lesson)}
          onAddLessonForDate={handleAddForDate}
          onCycleStatus={handleCycleStatus}
        />
      ) : viewMode === "map" ? (
        /* SPACIOUS, ELEGANT MAP / ROADMAP VIEW */
        <div className="relative pl-7 sm:pl-10 before:absolute before:left-3.5 sm:before:left-5 before:top-6 before:bottom-6 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-primary/40 before:to-muted space-y-6 sm:space-y-7 py-2">
          {filteredLessons.map((lesson, index) => {
            const isCompleted = lesson.status === "completed";
            const isInProgress = lesson.status === "in_progress";
            const matchingSchedule = schedules
              ? findMatchingTimetableSchedule(lesson.lessonDate || "", schedules)
              : undefined;

            return (
              <div key={lesson.id} className="relative group">
                {/* 1-Click Interactive Milestone Node */}
                <button
                  type="button"
                  onClick={() => handleCycleStatus(lesson)}
                  title={`Status: ${lesson.status.replace("_", " ")} — Click to advance`}
                  className={`absolute -left-7 sm:-left-10 top-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-transform duration-200 cursor-pointer shadow-xs ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-600 text-white hover:scale-115"
                      : isInProgress
                      ? "bg-amber-500 border-amber-600 text-white animate-pulse hover:scale-115"
                      : "bg-card border-slate-300 dark:border-slate-700 text-muted-foreground hover:border-primary hover:text-primary hover:scale-115"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isInProgress ? (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  ) : (
                    <span className="text-[11px] font-bold">
                      {lesson.lessonNumber || index + 1}
                    </span>
                  )}
                </button>

                {/* Lesson Card */}
                <div
                  className={`p-5 rounded-2xl border transition-all duration-200 shadow-xs ${
                    isCompleted
                      ? "bg-card hover:border-emerald-500/40 hover:shadow-sm"
                      : isInProgress
                      ? "bg-amber-500/5 border-amber-500/30 hover:shadow-sm"
                      : "bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  {/* Top Bar: Date with Day Name, Timetable Period, Lesson Order & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Day Name & Date Badge */}
                      {lesson.lessonDate && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-tight">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDateWithDay(lesson.lessonDate, true)}</span>
                        </div>
                      )}

                      {/* Timetable Period & Room Badge */}
                      {matchingSchedule && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] font-medium">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>
                            {matchingSchedule.startTime} – {matchingSchedule.endTime}
                          </span>
                          {matchingSchedule.room && (
                            <span className="flex items-center gap-0.5 text-foreground/80 font-semibold">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {matchingSchedule.room}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Lesson Number */}
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-bold">
                        Lesson {lesson.lessonNumber || index + 1}
                      </span>

                      {/* Unit or Topic */}
                      {lesson.unitOrTopic && (
                        <span className="px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground text-[11px] font-medium">
                          {lesson.unitOrTopic}
                        </span>
                      )}
                    </div>

                    {/* Status Badge & Action Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCycleStatus(lesson)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={
                            isCompleted
                              ? "success"
                              : isInProgress
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px] capitalize hover:opacity-80 transition-opacity font-semibold"
                        >
                          {lesson.status.replace("_", " ")}
                        </Badge>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingLesson(lesson)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                        title="Edit Lesson & Homework"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLesson(lesson)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lesson Title & Content */}
                  <div className="pt-3 space-y-2">
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {lesson.title}
                    </h3>

                    {/* Learning Objective */}
                    {lesson.learningObjectives && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground/90">
                          Objective:
                        </span>{" "}
                        {lesson.learningObjectives}
                      </p>
                    )}

                    {/* Teacher Reflection / Lesson Note */}
                    {lesson.notes && (
                      <p className="text-xs text-muted-foreground/80 italic leading-relaxed pt-0.5">
                        Note: {lesson.notes}
                      </p>
                    )}
                  </div>

                  {/* Assigned Homework Box */}
                  {lesson.assignmentTitle ? (
                    <div className="mt-4 p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                              Assigned Homework:
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {lesson.assignmentTitle}
                            </span>
                          </div>
                          {lesson.assignmentNotes && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lesson.assignmentNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      {lesson.assignmentDueDate && (
                        <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 shrink-0 self-start sm:self-auto bg-purple-500/10 px-2.5 py-1 rounded-lg">
                          Due: {formatDateWithDay(lesson.assignmentDueDate, false)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground/70">
                      <span className="italic text-[11px]">
                        No homework assigned for this lesson
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingLesson(lesson)}
                        className="text-primary font-medium hover:underline text-[11px] cursor-pointer"
                      >
                        + Assign Homework
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CLEAN TIMELINE / TABLE VIEW */
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[200px]">Lesson Title</th>
                  <th className="py-3 px-4 min-w-[160px]">Day, Date & Period</th>
                  <th className="py-3 px-4">Unit / Topic</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 min-w-[220px]">Assigned Homework</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLessons.map((lesson, idx) => {
                  const matchingSchedule = schedules
                    ? findMatchingTimetableSchedule(lesson.lessonDate || "", schedules)
                    : undefined;

                  return (
                    <tr
                      key={lesson.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-muted-foreground">
                        {lesson.lessonNumber || idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {lesson.title}
                        {lesson.learningObjectives && (
                          <p className="text-[11px] font-normal text-muted-foreground line-clamp-1 mt-0.5">
                            {lesson.learningObjectives}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {lesson.lessonDate ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                              {formatDateWithDay(lesson.lessonDate, false)}
                            </span>
                            {matchingSchedule && (
                              <span className="text-[10px] text-muted-foreground block">
                                {matchingSchedule.startTime}–{matchingSchedule.endTime}
                                {matchingSchedule.room ? ` (${matchingSchedule.room})` : ""}
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {lesson.unitOrTopic || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(lesson)}
                          className="cursor-pointer"
                        >
                          <Badge
                            variant={
                              lesson.status === "completed"
                                ? "success"
                                : lesson.status === "in_progress"
                                ? "warning"
                                : "secondary"
                            }
                            className="capitalize hover:opacity-80 text-[10px]"
                          >
                            {lesson.status.replace("_", " ")}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        {lesson.assignmentTitle ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-purple-500" />
                              <span>{lesson.assignmentTitle}</span>
                            </div>
                            {lesson.assignmentDueDate && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium block">
                                Due: {formatDateWithDay(lesson.assignmentDueDate, false)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic">
                            None
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingLesson(lesson)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingLesson(lesson)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Lesson Modal */}
      <LessonModal
        isOpen={isCreateModalOpen || editingLesson !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingLesson(null);
          setPreselectedDate(undefined);
        }}
        classId={classId}
        initialData={editingLesson}
        preselectedDate={preselectedDate}
        totalExistingLessons={lessons?.length || 0}
      />

      {/* Populate from Timetable Modal */}
      <GenerateLessonsModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        classId={classId}
        teacherClass={teacherClass}
        existingLessons={lessons || []}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingLesson !== null}
        onClose={() => setDeletingLesson(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete lesson "${deletingLesson?.title}"?`}
        message="This will remove this lesson and its assigned homework record from your curriculum progress roadmap."
        confirmText="Delete Lesson"
        variant="destructive"
      />
    </div>
  );
}
