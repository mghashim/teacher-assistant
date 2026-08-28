import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { studentsRepository } from "@/db/repositories/students.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { StudentModal } from "./StudentModal";

// Profile Tabs
import { PersonalTab } from "./tabs/PersonalTab";
import { GradesTab } from "./tabs/GradesTab";
import { HomeworkTab } from "./tabs/HomeworkTab";
import { DetentionsTab } from "./tabs/DetentionsTab";
import { NotesTab } from "./tabs/NotesTab";
import { FilesTab } from "./tabs/FilesTab";

import {
  ArrowLeft,
  User,
  Award,
  FileCheck,
  AlertTriangle,
  FileText,
  FolderOpen,
  Edit2,
  Trash2,
  GraduationCap,
} from "lucide-react";

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const studentId = Number(id);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("personal");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Live queries
  const student = useLiveQuery(() => db.students.get(studentId), [studentId]);
  const teacherClass = useLiveQuery(
    () => (student?.classId ? db.classes.get(student.classId) : undefined),
    [student?.classId]
  );
  const detentionsCount = useLiveQuery(
    () => db.detentions.where("studentId").equals(studentId).count(),
    [studentId]
  );
  const homeworkCount = useLiveQuery(
    () => db.homework.where("studentId").equals(studentId).count(),
    [studentId]
  );
  const gradesCount = useLiveQuery(
    () => db.grades.where("studentId").equals(studentId).count(),
    [studentId]
  );
  const notesCount = useLiveQuery(
    () => db.notes.where("studentId").equals(studentId).count(),
    [studentId]
  );
  const filesCount = useLiveQuery(
    () => db.files.where("studentId").equals(studentId).count(),
    [studentId]
  );

  if (!student) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Student not found or loading...</p>
        <Button variant="outline" onClick={() => navigate("/students")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
        </Button>
      </div>
    );
  }

  const handleDeleteStudent = async () => {
    await studentsRepository.deleteCascade(studentId);
    navigate("/students");
  };

  const tabs = [
    {
      id: "personal",
      label: "Personal Information",
      icon: User,
    },
    {
      id: "grades",
      label: "Grades & Assessments",
      icon: Award,
      badge: gradesCount ?? 0,
    },
    {
      id: "homework",
      label: "Homework",
      icon: FileCheck,
      badge: homeworkCount ?? 0,
    },
    {
      id: "detentions",
      label: "Detentions",
      icon: AlertTriangle,
      badge: detentionsCount ?? 0,
    },
    {
      id: "notes",
      label: "Observations & Notes",
      icon: FileText,
      badge: notesCount ?? 0,
    },
    {
      id: "files",
      label: "Files & Documents",
      icon: FolderOpen,
      badge: filesCount ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/students")}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Button>

        {/* Student Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-card border shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {student.firstName} {student.lastName}
                </h1>
                {student.preferredName &&
                  student.preferredName !== student.firstName && (
                    <span className="text-sm font-medium text-muted-foreground">
                      ("{student.preferredName}")
                    </span>
                  )}
                <Badge
                  variant={student.active ? "success" : "secondary"}
                  className="text-xs"
                >
                  {student.active ? "Active Student" : "Inactive"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                {teacherClass ? (
                  <Link
                    to={`/classes/${teacherClass.id}`}
                    className="font-medium hover:underline hover:text-primary transition-colors"
                  >
                    {teacherClass.name}
                  </Link>
                ) : (
                  <span>Unassigned Class</span>
                )}
                {student.email && <span>• {student.email}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Panels */}
      <div>
        {activeTab === "personal" && <PersonalTab student={student} />}
        {activeTab === "grades" && <GradesTab student={student} />}
        {activeTab === "homework" && <HomeworkTab student={student} />}
        {activeTab === "detentions" && <DetentionsTab student={student} />}
        {activeTab === "notes" && <NotesTab student={student} />}
        {activeTab === "files" && <FilesTab student={student} />}
      </div>

      {/* Edit Student Modal */}
      <StudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={student}
      />

      {/* Delete Student Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteStudent}
        title={`Delete "${student.firstName} ${student.lastName}"?`}
        message="This will permanently delete this student and cascade to all their grades, homework, detentions, teacher notes, and files. This action cannot be undone."
        confirmText="Delete Student & All Records"
      />
    </div>
  );
}
