import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { classesRepository } from "@/db/repositories/classes.repository";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ClassModal } from "./ClassModal";
import {
  GraduationCap,
  Plus,
  Users,
  Calendar,
  Edit2,
  Trash2,
  ChevronRight,
} from "lucide-react";
import type { TeacherClass } from "@/types/database";

export function ClassesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TeacherClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<TeacherClass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live queries for reactive updates
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const schedules = useLiveQuery(() => db.classSchedules.toArray(), []);

  const handleDeleteConfirm = async () => {
    if (!deletingClass || !deletingClass.id) return;
    setIsDeleting(true);
    try {
      await classesRepository.deleteCascade(deletingClass.id);
      setDeletingClass(null);
    } catch (err) {
      alert("Failed to delete class: " + (err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your classroom groups, subjects, and weekly timetable lesson slots.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Class
        </Button>
      </div>

      {/* Class Grid */}
      {!classes || classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classes created yet"
          description="Create your first class group to start managing students, lesson schedules, homework, and grades."
          actionLabel="Add First Class"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c) => {
            const classStudents = students?.filter((s) => s.classId === c.id) ?? [];
            const activeStudents = classStudents.filter((s) => s.active);
            const classSchedules = schedules?.filter((s) => s.classId === c.id) ?? [];

            return (
              <Card key={c.id} className="flex flex-col justify-between hover:border-primary/40 transition-all hover:shadow-md group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                        <Link to={`/classes/${c.id}`}>{c.name}</Link>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {c.subject && (
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {c.subject}
                          </Badge>
                        )}
                        {c.academicYear && (
                          <span className="text-xs text-muted-foreground">
                            {c.academicYear}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingClass(c)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Edit Class Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingClass(c)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {c.description && (
                    <CardDescription className="line-clamp-2 mt-2 text-xs">
                      {c.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  {/* Students count */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <Users className="w-3.5 h-3.5 text-blue-500" /> Enrolled Students:
                    </span>
                    <span className="font-semibold text-foreground">
                      {activeStudents.length} active{" "}
                      {classStudents.length !== activeStudents.length && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({classStudents.length} total)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Timetable overview */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" /> Weekly Lessons ({classSchedules.length})
                    </span>
                    {classSchedules.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">
                        No scheduled lessons defined
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {classSchedules.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900"
                          >
                            {s.dayOfWeek.slice(0, 3).toUpperCase()} {s.startTime}–{s.endTime}
                          </span>
                        ))}
                        {classSchedules.length > 3 && (
                          <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            +{classSchedules.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t">
                  <Link
                    to={`/classes/${c.id}`}
                    className="w-full flex items-center justify-between text-xs text-primary font-semibold hover:bg-primary/5 p-2 rounded-lg transition-colors"
                  >
                    <span>Open Class Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Class Modal */}
      <ClassModal
        isOpen={isCreateModalOpen || editingClass !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingClass(null);
        }}
        initialData={editingClass}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingClass !== null}
        onClose={() => setDeletingClass(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${deletingClass?.name}"?`}
        message="This will permanently delete the class and cascade to all its enrolled students, grades, homework, detentions, timetables, notes, files, and tasks. This action cannot be undone."
        confirmText="Delete Class & All Records"
        isLoading={isDeleting}
      />
    </div>
  );
}
