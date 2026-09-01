import Dexie, { type Table } from "dexie";
import type {
  TeacherClass,
  ClassSchedule,
  Student,
  Assessment,
  Grade,
  Homework,
  Detention,
  TeacherNote,
  Intervention,
  ClassLesson,
  StoredFile,
  Task,
  AppSetting,
} from "@/types/database";

export class TeacherAssistantDB extends Dexie {
  classes!: Table<TeacherClass, number>;
  classSchedules!: Table<ClassSchedule, number>;
  students!: Table<Student, number>;
  assessments!: Table<Assessment, number>;
  grades!: Table<Grade, number>;
  homework!: Table<Homework, number>;
  detentions!: Table<Detention, number>;
  notes!: Table<TeacherNote, number>;
  interventions!: Table<Intervention, number>;
  lessons!: Table<ClassLesson, number>;
  files!: Table<StoredFile, number>;
  tasks!: Table<Task, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super("TeacherAssistantDB");

    // Define schema version 1 with targeted indexing for fast queries and joins
    this.version(1).stores({
      classes: "++id, name, subject, academicYear, createdAt",
      classSchedules: "++id, classId, dayOfWeek, startTime, endTime, [classId+dayOfWeek]",
      students: "++id, classId, [classId+active], lastName, firstName, active, createdAt",
      assessments: "++id, classId, type, assessmentDate, createdAt",
      grades: "++id, assessmentId, studentId, [assessmentId+studentId], score, createdAt",
      homework: "++id, studentId, classId, [studentId+approved], [classId+homeworkDate], homeworkDate, type, approved, createdAt",
      detentions: "++id, studentId, classId, detentionDate, type, [studentId+detentionDate], createdAt",
      notes: "++id, studentId, category, noteDate, [studentId+category], createdAt",
      files: "++id, classId, studentId, name, mimeType, createdAt",
      tasks: "++id, classId, studentId, dueDate, completed, [completed+dueDate], createdAt",
      settings: "key",
    });

    // Version 2: Add interventions table
    this.version(2).stores({
      interventions: "++id, studentId, classId, date, type, effectiveness, [studentId+date], createdAt",
    });

    // Version 3: Multi-class enrollment indexing
    this.version(3).stores({
      students: "++id, classId, *classIds, lastName, firstName, active, createdAt",
    });

    // Version 4: Class lessons progress map and assignments
    this.version(4).stores({
      lessons: "++id, classId, status, lessonDate, orderIndex, [classId+orderIndex], createdAt",
    });
  }
}

// Global database singleton
export const db = new TeacherAssistantDB();
