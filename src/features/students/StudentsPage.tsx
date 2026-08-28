import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { studentsRepository } from "@/db/repositories/students.repository";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { StudentModal } from "./StudentModal";
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  Phone,
  Mail,
  GraduationCap,
  Award,
  AlertTriangle,
} from "lucide-react";
import type { Student } from "@/types/database";

export function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live queries
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);
  const allStudents = useLiveQuery(() => db.students.toArray(), []);
  const detentions = useLiveQuery(() => db.detentions.toArray(), []);
  const grades = useLiveQuery(() => db.grades.toArray(), []);

  // Filter students based on search, class, and active status
  const filteredStudents = useMemo(() => {
    if (!allStudents) return [];

    return allStudents.filter((student) => {
      // Class filter
      if (selectedClassId !== "all" && student.classId !== selectedClassId) {
        return false;
      }
      // Active filter
      if (showActiveOnly && !student.active) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${student.firstName} ${student.lastName} ${student.preferredName || ""}`.toLowerCase();
        const email = (student.email || "").toLowerCase();
        const parent = (student.parentName || "").toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !parent.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [allStudents, selectedClassId, showActiveOnly, searchQuery]);

  const classMap = useMemo(() => {
    const map = new Map<number, string>();
    classes?.forEach((c) => {
      if (c.id) map.set(c.id, c.name);
    });
    return map;
  }, [classes]);

  const handleDeleteConfirm = async () => {
    if (!deletingStudent?.id) return;
    setIsDeleting(true);
    try {
      await studentsRepository.deleteCascade(deletingStudent.id);
      setDeletingStudent(null);
    } catch (err) {
      alert("Failed to delete student: " + (err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View profiles, detention history, homework records, and grades.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Enroll Student
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, email, or parent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <Select
            value={selectedClassId}
            onChange={(e) =>
              setSelectedClassId(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
          >
            <option value="all">All Classes ({allStudents?.length ?? 0} students)</option>
            {classes?.map((c) => {
              const count = allStudents?.filter((s) => s.classId === c.id).length ?? 0;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({count})
                </option>
              );
            })}
          </Select>
        </div>

        <div className="sm:col-span-3 flex items-center justify-end h-9">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Active Only</span>
          </label>
        </div>
      </div>

      {/* Student List Grid */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={
            searchQuery || selectedClassId !== "all"
              ? "Try adjusting your search query or class filter."
              : "Enroll your first student to begin logging academic performance."
          }
          actionLabel={searchQuery ? undefined : "Enroll Student"}
          onAction={searchQuery ? undefined : () => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const studentDetentions =
              detentions?.filter((d) => d.studentId === student.id) ?? [];
            const studentGrades =
              grades?.filter((g) => g.studentId === student.id) ?? [];
            const classNameStr = classMap.get(student.classId) || "Unknown Class";

            return (
              <div
                key={student.id}
                className="p-5 rounded-xl border bg-card hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/students/${student.id}`}
                        className="font-bold text-base group-hover:text-primary transition-colors block"
                      >
                        {student.lastName}, {student.firstName}
                        {student.preferredName &&
                          student.preferredName !== student.firstName && (
                            <span className="text-xs text-muted-foreground font-normal ml-1">
                              "{student.preferredName}"
                            </span>
                          )}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-medium truncate max-w-[180px]">
                          {classNameStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Edit Student Info"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingStudent(student)}
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Snippet */}
                  <div className="text-xs text-muted-foreground space-y-1 pt-1">
                    {student.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    )}
                    {student.parentName && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          Parent: {student.parentName}{" "}
                          {student.parentPhone && `(${student.parentPhone})`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges & Stats footer */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {studentDetentions.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {studentDetentions.length}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {studentGrades.length} Grades
                    </span>
                  </div>

                  <Link
                    to={`/students/${student.id}`}
                    className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Profile</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Student Modal */}
      <StudentModal
        isOpen={isAddModalOpen || editingStudent !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStudent(null);
        }}
        initialData={editingStudent}
        defaultClassId={selectedClassId === "all" ? undefined : selectedClassId}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingStudent !== null}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete student "${deletingStudent?.firstName} ${deletingStudent?.lastName}"?`}
        message="This will permanently delete this student along with all their recorded grades, homework submissions, detention records, teacher notes, and uploaded files. This action is irreversible."
        confirmText="Delete Student & All Data"
        isLoading={isDeleting}
      />
    </div>
  );
}
