import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getDayOfWeekFromDate, sortSchedulesByTime, calculatePercentage } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";

// Quick action modals
import { StudentModal } from "@/features/students/StudentModal";
import { ClassModal } from "@/features/classes/ClassModal";
import { HomeworkModal } from "@/features/students/tabs/HomeworkModal";
import { AssessmentModal } from "@/features/grades/AssessmentModal";
import { DetentionModal } from "@/features/students/tabs/DetentionModal";
import { EnterMarksPickerModal } from "@/features/grades/EnterMarksPickerModal";
import { GradeEntryModal } from "@/features/grades/GradeEntryModal";

import {
  GraduationCap,
  Users,
  Calendar,
  FileCheck,
  CheckSquare,
  AlertTriangle,
  Award,
  Clock,
  MapPin,
  Plus,
  ArrowUpRight,
  FileSpreadsheet,
} from "lucide-react";
import type { Assessment } from "@/types/database";

export function DashboardPage() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedGradeEntryAssessment, setSelectedGradeEntryAssessment] = useState<Assessment | null>(null);

  // Live queries
  const classes = useLiveQuery(() => db.classes.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const schedules = useLiveQuery(() => db.classSchedules.toArray(), []);
  const homework = useLiveQuery(() => db.homework.toArray(), []);
  const detentions = useLiveQuery(() => db.detentions.orderBy("detentionDate").reverse().toArray(), []);
  const grades = useLiveQuery(() => db.grades.orderBy("createdAt").reverse().toArray(), []);
  const assessments = useLiveQuery(() => db.assessments.toArray(), []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);

  const todayDayOfWeek = useMemo(() => getDayOfWeekFromDate(new Date()), []);

  const classMap = useMemo(() => {
    const map = new Map<number, string>();
    classes?.forEach((c) => {
      if (c.id) map.set(c.id, c.name);
    });
    return map;
  }, [classes]);

  const studentMap = useMemo(() => {
    const map = new Map<number, string>();
    students?.forEach((s) => {
      if (s.id) map.set(s.id, `${s.lastName}, ${s.firstName}`);
    });
    return map;
  }, [students]);

  const assessmentMap = useMemo(() => {
    const map = new Map<number, Assessment>();
    assessments?.forEach((a) => {
      if (a.id) map.set(a.id, a);
    });
    return map;
  }, [assessments]);

  // Today's lessons
  const todaysLessons = useMemo(() => {
    if (!schedules) return [];
    const filtered = schedules.filter((s) => s.dayOfWeek === todayDayOfWeek);
    return sortSchedulesByTime(filtered);
  }, [schedules, todayDayOfWeek]);

  // Upcoming pending tasks
  const pendingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => !t.completed)
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
      .slice(0, 4);
  }, [tasks]);

  // Pending homework to approve
  const pendingHomework = useMemo(() => {
    if (!homework) return [];
    return homework.filter((h) => !h.approved).slice(0, 4);
  }, [homework]);

  // Key Stats
  const statCards = [
    {
      title: "Classes",
      value: classes?.length ?? 0,
      sub: `${schedules?.length ?? 0} timetable slots`,
      icon: GraduationCap,
      href: "/classes",
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50",
    },
    {
      title: "Students",
      value: students?.length ?? 0,
      sub: `${students?.filter((s) => s.active).length ?? 0} active pupils`,
      icon: Users,
      href: "/students",
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
    },
    {
      title: "Today's Lessons",
      value: todaysLessons.length,
      sub: `${todayDayOfWeek.toUpperCase()} Schedule`,
      icon: Calendar,
      href: "/timetable",
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      title: "Pending Homework",
      value: pendingHomework.length,
      sub: "Awaiting approval",
      icon: FileCheck,
      href: "/students",
      color: "text-teal-600 bg-teal-50 dark:bg-teal-950/50",
    },
    {
      title: "Pending Tasks",
      value: tasks?.filter((t) => !t.completed).length ?? 0,
      sub: "To-do items",
      icon: CheckSquare,
      href: "/tasks",
      color: "text-violet-600 bg-violet-50 dark:bg-violet-950/50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Teacher Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Good day. Here is today's overview for {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.
          </p>
        </div>

        {/* Quick-action buttons bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModal("enter_marks")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Enter Marks
          </button>
          <button
            onClick={() => setActiveModal("student")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Student
          </button>
          <button
            onClick={() => setActiveModal("class")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Class
          </button>
          <button
            onClick={() => setActiveModal("homework")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-xs font-semibold border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Homework
          </button>
          <button
            onClick={() => setActiveModal("assessment")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Assessment
          </button>
          <button
            onClick={() => setActiveModal("detention")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Detention
          </button>
        </div>
      </div>

      {/* 5 Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((st) => {
          const Icon = st.icon;
          return (
            <Link
              key={st.title}
              to={st.href}
              className="p-4 rounded-xl bg-card border hover:border-primary/50 transition-all hover:shadow-sm flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {st.title}
                </span>
                <div className={`p-1.5 rounded-lg ${st.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {st.value}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                  {st.sub}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Today's Schedule & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Today's Schedule (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Today's Lesson Schedule
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {todayDayOfWeek.toUpperCase()} timetable periods
                </p>
              </div>
              <Link
                to="/timetable"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                View Full Timetable <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardHeader>

            <CardContent className="space-y-3">
              {todaysLessons.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  No classes scheduled for {todayDayOfWeek}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todaysLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-3.5 rounded-xl border bg-card/60 hover:bg-card transition-colors flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-foreground">
                          {classMap.get(lesson.classId) || "Class"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {lesson.startTime} – {lesson.endTime}
                          </span>
                          {lesson.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {lesson.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {}}>
                        <Link to={`/classes/${lesson.classId}`}>Open</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Academic Grades Activity */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" />
                Recent Academic Grades Recorded
              </CardTitle>
              <Link
                to="/grades"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                Open Gradebook <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardHeader>

            <CardContent>
              {!grades || grades.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  No assessment grades recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {grades.slice(0, 4).map((grade) => {
                    const studentName = studentMap.get(grade.studentId) || "Student";
                    const assessment = assessmentMap.get(grade.assessmentId);
                    const pct = assessment
                      ? calculatePercentage(grade.score, assessment.maxScore)
                      : null;

                    return (
                      <div
                        key={grade.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <Link
                            to={`/students/${grade.studentId}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            {studentName}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">
                            {assessment?.title || "Assessment"}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="font-bold text-foreground">
                            {grade.score}
                            {assessment && `/${assessment.maxScore}`}
                          </span>
                          {pct !== null && (
                            <span className="text-primary font-bold ml-1.5">
                              ({pct}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Upcoming Tasks & Recent Detentions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-500" />
                Upcoming Tasks
              </CardTitle>
              <Link
                to="/tasks"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardHeader>

            <CardContent>
              {pendingTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  All caught up! No pending tasks.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border bg-card/60 space-y-1 text-xs"
                    >
                      <div className="font-semibold text-foreground leading-snug">
                        {t.title}
                      </div>
                      {t.dueDate && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {formatDate(t.dueDate)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Detentions Log */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Recent Detentions
              </CardTitle>
              <Link
                to="/students"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                Pupil Directory <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardHeader>

            <CardContent>
              {!detentions || detentions.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  No detention records logged.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {detentions.slice(0, 3).map((det) => (
                    <div
                      key={det.id}
                      className="p-3 rounded-lg border bg-card/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/students/${det.studentId}`}
                          className="font-bold text-foreground hover:text-primary"
                        >
                          {studentMap.get(det.studentId) || "Student"}
                        </Link>
                        <Badge variant="destructive" className="text-[10px] capitalize">
                          {det.type}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] line-clamp-1">
                        {det.reason}
                      </p>
                      <span className="text-[10px] text-muted-foreground block">
                        {formatDate(det.detentionDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Action Modals */}
      <EnterMarksPickerModal
        isOpen={activeModal === "enter_marks"}
        onClose={() => setActiveModal(null)}
        onSelectAssessment={(assessment) => setSelectedGradeEntryAssessment(assessment)}
      />
      <GradeEntryModal
        isOpen={selectedGradeEntryAssessment !== null}
        onClose={() => setSelectedGradeEntryAssessment(null)}
        assessment={selectedGradeEntryAssessment}
      />
      <StudentModal
        isOpen={activeModal === "student"}
        onClose={() => setActiveModal(null)}
      />
      <ClassModal
        isOpen={activeModal === "class"}
        onClose={() => setActiveModal(null)}
      />
      <HomeworkModal
        isOpen={activeModal === "homework"}
        onClose={() => setActiveModal(null)}
      />
      <AssessmentModal
        isOpen={activeModal === "assessment"}
        onClose={() => setActiveModal(null)}
      />
      <DetentionModal
        isOpen={activeModal === "detention"}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
