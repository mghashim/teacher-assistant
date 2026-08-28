import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { tasksRepository } from "@/db/repositories/tasks.repository";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { TaskModal } from "./TaskModal";
import { formatDate } from "@/lib/utils";
import {
  CheckSquare,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  GraduationCap,
  User,
} from "lucide-react";
import type { Task } from "@/types/database";

export function TasksPage() {
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("pending");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Live queries
  const allTasks = useLiveQuery(() => db.tasks.orderBy("dueDate").toArray(), []);
  const classes = useLiveQuery(() => db.classes.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);

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

  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    if (filterStatus === "pending") return allTasks.filter((t) => !t.completed);
    if (filterStatus === "completed") return allTasks.filter((t) => t.completed);
    return allTasks;
  }, [allTasks, filterStatus]);

  const handleToggle = async (task: Task) => {
    if (!task.id) return;
    await tasksRepository.toggleComplete(task.id, !task.completed);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask?.id) return;
    await tasksRepository.delete(deletingTask.id);
    setDeletingTask(null);
  };

  const pendingCount = allTasks?.filter((t) => !t.completed).length ?? 0;
  const completedCount = allTasks?.filter((t) => t.completed).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage preparation reminders, marking deadlines, and follow-ups.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          onClick={() => setFilterStatus("pending")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filterStatus === "pending"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus("completed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filterStatus === "completed"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filterStatus === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          All Tasks ({allTasks?.length ?? 0})
        </button>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks in this view"
          description={
            filterStatus === "pending"
              ? "You're all caught up! No pending tasks."
              : "No tasks found."
          }
          actionLabel="Create a Task"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const classNameStr = task.classId ? classMap.get(task.classId) : null;
            const studentNameStr = task.studentId ? studentMap.get(task.studentId) : null;
            const isOverdue =
              task.dueDate &&
              !task.completed &&
              task.dueDate < new Date().toISOString().split("T")[0];

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border bg-card transition-all flex items-start justify-between gap-3 ${
                  task.completed ? "opacity-60 bg-muted/30" : "hover:border-primary/40 shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggle(task)}
                    />
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    <div
                      className={`font-semibold text-sm leading-snug ${
                        task.completed ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      {task.dueDate && (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isOverdue
                              ? "text-rose-600 dark:text-rose-400 font-bold"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          Due {formatDate(task.dueDate)} {isOverdue && "(Overdue)"}
                        </span>
                      )}

                      {classNameStr && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-indigo-500" />
                          {classNameStr}
                        </span>
                      )}

                      {studentNameStr && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-500" />
                          {studentNameStr}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                    title="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingTask(task)}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isAddModalOpen || editingTask !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTask(null);
        }}
        initialData={editingTask}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingTask !== null}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task?"
        message={`Are you sure you want to delete task "${deletingTask?.title}"?`}
        confirmText="Delete Task"
      />
    </div>
  );
}
