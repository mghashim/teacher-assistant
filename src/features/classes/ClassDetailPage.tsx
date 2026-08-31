import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { classesRepository } from "@/db/repositories/classes.repository";
import { schedulesRepository } from "@/db/repositories/schedules.repository";
import { filesRepository } from "@/db/repositories/files.repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ClassModal } from "./ClassModal";
import { ClassScheduleModal } from "./ClassScheduleModal";
import { StudentModal } from "@/features/students/StudentModal";
import { sortSchedulesByTime } from "@/lib/calculations";
import { formatDate, formatFileSize } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Users,
  Plus,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  FileText,
  Upload,
  Download,
  Award,
} from "lucide-react";
import type { ClassSchedule, StoredFileMetadata } from "@/types/database";

export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const classId = Number(id);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("timetable");
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ClassSchedule | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isDeleteClassOpen, setIsDeleteClassOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState<StoredFileMetadata | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Live queries
  const teacherClass = useLiveQuery(() => db.classes.get(classId), [classId]);
  const schedules = useLiveQuery(
    () => db.classSchedules.where("classId").equals(classId).toArray(),
    [classId]
  );
  const students = useLiveQuery(
    () => db.students.where("classId").equals(classId).sortBy("lastName"),
    [classId]
  );
  const files = useLiveQuery(
    () => db.files.where("classId").equals(classId).toArray(),
    [classId]
  );
  const assessments = useLiveQuery(
    () => db.assessments.where("classId").equals(classId).toArray(),
    [classId]
  );

  if (!teacherClass) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Class not found or loading...</p>
        <Button variant="outline" onClick={() => navigate("/classes")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Classes
        </Button>
      </div>
    );
  }

  const sortedSchedules = schedules ? sortSchedulesByTime(schedules) : [];

  const handleDeleteClass = async () => {
    await classesRepository.deleteCascade(classId);
    navigate("/classes");
  };

  const handleDeleteSchedule = async () => {
    if (!deletingSchedule?.id) return;
    await schedulesRepository.delete(deletingSchedule.id);
    setDeletingSchedule(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      await filesRepository.uploadFile({
        classId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        blob: file,
      });
    } catch (err) {
      alert("File upload error: " + (err as Error).message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDownloadFile = async (fileMeta: StoredFileMetadata) => {
    if (!fileMeta.id) return;
    const fullFile = await filesRepository.getFileWithBlob(fileMeta.id);
    if (fullFile) {
      filesRepository.downloadFile(fullFile);
    }
  };

  const handleConfirmDeleteFile = async () => {
    if (!deletingFile?.id) return;
    await filesRepository.delete(deletingFile.id);
    setDeletingFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Back button & Class header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/classes")}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Classes
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-card border shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {teacherClass.name}
              </h1>
              {teacherClass.subject && (
                <Badge variant="info">{teacherClass.subject}</Badge>
              )}
              {teacherClass.academicYear && (
                <span className="text-xs text-muted-foreground font-medium">
                  {teacherClass.academicYear}
                </span>
              )}
            </div>
            {teacherClass.description && (
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                {teacherClass.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditClassOpen(true)}
              className="gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Class
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteClassOpen(true)}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <Tabs
        tabs={[
          {
            id: "timetable",
            label: "Lesson Timetable",
            icon: Calendar,
            badge: sortedSchedules.length,
          },
          {
            id: "students",
            label: "Enrolled Students",
            icon: Users,
            badge: students?.length ?? 0,
          },
          {
            id: "assessments",
            label: "Assessments",
            icon: Award,
            badge: assessments?.length ?? 0,
          },
          {
            id: "files",
            label: "Class Files & Resources",
            icon: FileText,
            badge: files?.length ?? 0,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Lesson Timetable */}
      {activeTab === "timetable" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Weekly Timetable Schedule</h2>
              <p className="text-xs text-muted-foreground">
                Define the recurring weekly periods and classroom locations for this class.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddScheduleOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Lesson Time
            </Button>
          </div>

          {sortedSchedules.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No lesson schedule set"
              description="Define weekly lesson times so upcoming lessons appear on your Dashboard."
              actionLabel="Add First Lesson"
              onAction={() => setIsAddScheduleOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedSchedules.map((sched) => (
                <Card key={sched.id} className="p-4 space-y-3 relative hover:shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-sm uppercase tracking-wide text-primary">
                      {sched.dayOfWeek}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingSchedule(sched)}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                        title="Edit schedule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingSchedule(sched)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                        title="Delete schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sched.startTime} – {sched.endTime}</span>
                    </div>

                    {sched.room && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Room: {sched.room}</span>
                      </div>
                    )}

                    {sched.notes && (
                      <div className="pt-1 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
                        {sched.notes}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Enrolled Students */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Enrolled Students</h2>
              <p className="text-xs text-muted-foreground">
                All pupils enrolled in {teacherClass.name}.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddStudentOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Student
            </Button>
          </div>

          {!students || students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students in this class yet"
              description="Enroll students into this class to start logging homework, grades, and observations."
              actionLabel="Add Student"
              onAction={() => setIsAddStudentOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {students.map((student) => (
                <Link
                  key={student.id}
                  to={`/students/${student.id}`}
                  className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-all hover:shadow-sm flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {student.lastName}, {student.firstName}
                      {student.preferredName && student.preferredName !== student.firstName && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          ({student.preferredName})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {student.email || student.parentName || "No contact info"}
                    </div>
                  </div>

                  <Badge
                    variant={student.active ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {student.active ? "Active" : "Inactive"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Assessments */}
      {activeTab === "assessments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Class Assessments & Exams</h2>
              <p className="text-xs text-muted-foreground">
                Exams, tests, and homework assessments assigned to this class.
              </p>
            </div>
            <Link
              to="/grades"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-colors"
            >
              <Award className="w-4 h-4" /> Open Full Gradebook
            </Link>
          </div>

          {!assessments || assessments.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No assessments recorded"
              description="Create an assessment to record marks and monitor class performance."
            />
          ) : (
            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              {assessments.map((a) => (
                <div key={a.id} className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm">{a.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {a.type}
                      </Badge>
                      <span>Max Mark: {a.maxScore}</span>
                      {a.assessmentDate && (
                        <span>• Date: {formatDate(a.assessmentDate)}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    to="/grades"
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors"
                  >
                    View in Grades Table
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Files */}
      {activeTab === "files" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Class Files & Attachments</h2>
              <p className="text-xs text-muted-foreground">
                Upload syllabus sheets, worksheets, and resources stored locally in IndexedDB.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isUploadingFile ? "Uploading..." : "Upload File"}</span>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={isUploadingFile}
                className="hidden"
              />
            </label>
          </div>

          {!files || files.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents uploaded"
              description="Attach lesson handouts, schemes of work, or syllabus PDFs to this class."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 rounded-xl border bg-card flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5 overflow-hidden">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-xs truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingFile(file)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ClassModal
        isOpen={isEditClassOpen}
        onClose={() => setIsEditClassOpen(false)}
        initialData={teacherClass}
      />

      <ClassScheduleModal
        isOpen={isAddScheduleOpen || editingSchedule !== null}
        onClose={() => {
          setIsAddScheduleOpen(false);
          setEditingSchedule(null);
        }}
        classId={classId}
        initialData={editingSchedule}
      />

      <StudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        defaultClassId={classId}
      />

      <ConfirmationModal
        isOpen={isDeleteClassOpen}
        onClose={() => setIsDeleteClassOpen(false)}
        onConfirm={handleDeleteClass}
        title={`Delete "${teacherClass.name}"?`}
        message="This will permanently delete this class, its timetable schedules, students, grades, homework, detentions, notes, and files. This action cannot be undone."
        confirmText="Delete Class & All Data"
      />

      <ConfirmationModal
        isOpen={deletingSchedule !== null}
        onClose={() => setDeletingSchedule(null)}
        onConfirm={handleDeleteSchedule}
        title="Delete Lesson Time?"
        message={`Are you sure you want to remove ${deletingSchedule?.dayOfWeek} (${deletingSchedule?.startTime}–${deletingSchedule?.endTime}) from this class schedule?`}
        confirmText="Delete Lesson"
      />

      <ConfirmationModal
        isOpen={deletingFile !== null}
        onClose={() => setDeletingFile(null)}
        onConfirm={handleConfirmDeleteFile}
        title="Delete Class Document"
        message={`Are you sure you want to permanently delete "${deletingFile?.name}" from local storage?`}
        confirmText="Delete Document"
        variant="destructive"
        requirePassword={true}
      />
    </div>
  );
}
