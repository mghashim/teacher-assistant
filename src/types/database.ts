export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type AssessmentType =
  | "assignment"
  | "exam"
  | "quiz"
  | "mock"
  | "speaking"
  | "writing"
  | "reading"
  | "listening"
  | "practical"
  | "project"
  | "other";

export type HomeworkType =
  | "written"
  | "reading"
  | "speaking"
  | "vocabulary"
  | "grammar"
  | "research"
  | "project"
  | "revision"
  | "other"
  | string;

export type DetentionType =
  | "break"
  | "lunch"
  | "8:00-am"
  | "morning-8am"
  | "after-school"
  | "department"
  | "other"
  | string;

export type NoteCategory =
  | "academic"
  | "behaviour"
  | "progress"
  | "parent-communication"
  | "achievement"
  | "concern"
  | "general";

export interface TeacherClass {
  id?: number;
  name: string;
  subject?: string;
  academicYear?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSchedule {
  id?: number;
  classId: number;
  dayOfWeek: DayOfWeek;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "09:45"
  room?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id?: number;
  classId: number;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  generalNotes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id?: number;
  classId: number;
  title: string;
  type: AssessmentType;
  maxScore: number;
  assessmentDate?: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id?: number;
  assessmentId: number;
  studentId: number;
  score: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Homework {
  id?: number;
  studentId: number;
  classId: number;
  type: HomeworkType;
  title: string;
  homeworkDate: string;
  mark?: number;
  maxMark?: number;
  approved: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Detention {
  id?: number;
  studentId: number;
  classId: number;
  detentionDate: string;
  type: DetentionType;
  reason: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherNote {
  id?: number;
  studentId: number;
  title?: string;
  category?: NoteCategory;
  content: string;
  noteDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredFile {
  id?: number;
  classId?: number;
  studentId?: number;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

/**
 * Lightweight File Metadata (omits binary blob for fast listing queries)
 */
export type StoredFileMetadata = Omit<StoredFile, "blob">;

export interface Task {
  id?: number;
  title: string;
  description?: string;
  classId?: number;
  studentId?: number;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting<T = unknown> {
  key: string;
  value: T;
}

/**
 * Serialized file representation during JSON export
 */
export interface SerializedStoredFile {
  id?: number;
  classId?: number;
  studentId?: number;
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
  createdAt: string;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  appName: string;
  data: {
    classes: TeacherClass[];
    classSchedules: ClassSchedule[];
    students: Student[];
    assessments: Assessment[];
    grades: Grade[];
    homework: Homework[];
    detentions: Detention[];
    notes: TeacherNote[];
    tasks: Task[];
    settings: AppSetting[];
    files: SerializedStoredFile[];
  };
}
