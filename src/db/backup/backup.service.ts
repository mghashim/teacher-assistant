import { db } from "../database";
import { settingsRepository } from "../repositories/settings.repository";
import { formatDateTime } from "@/lib/utils";
import type {
  BackupPayload,
  SerializedStoredFile,
  StoredFile,
} from "@/types/database";

/**
 * Convert a native Blob to a Base64 string for portable JSON export
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      // Extract pure base64 payload from data URL
      const base64Index = res.indexOf(";base64,");
      if (base64Index !== -1) {
        resolve(res.substring(base64Index + 8));
      } else {
        resolve(res);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a Base64 string back to a native Blob during backup import
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];

  const sliceSize = 512;
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays as BlobPart[], { type: mimeType });
}

export interface NewerLocalDataStats {
  classes: number;
  students: number;
  grades: number;
  homework: number;
  detentions: number;
  notes: number;
  interventions: number;
  lessons: number;
  tasks: number;
  files: number;
}

export interface BackupInspectionResult {
  backupDate: string;
  backupDateFormatted: string;
  totalBackupRecords: number;
  hasNewerLocalData: boolean;
  totalNewerLocalRecords: number;
  newerBreakdown: NewerLocalDataStats;
}

export const backupService = {
  /**
   * Generates a complete JSON backup object with binary files converted to Base64.
   * This operation is strictly read-only on all data tables.
   */
  async generateBackup(): Promise<BackupPayload> {
    const [
      classes,
      classSchedules,
      students,
      assessments,
      grades,
      homework,
      detentions,
      notes,
      interventions,
      lessons,
      tasks,
      settings,
      files,
    ] = await Promise.all([
      db.classes.toArray(),
      db.classSchedules.toArray(),
      db.students.toArray(),
      db.assessments.toArray(),
      db.grades.toArray(),
      db.homework.toArray(),
      db.detentions.toArray(),
      db.notes.toArray(),
      db.interventions.toArray(),
      db.lessons.toArray(),
      db.tasks.toArray(),
      db.settings.toArray(),
      db.files.toArray(),
    ]);

    // Convert Blobs to Base64
    const serializedFiles: SerializedStoredFile[] = [];
    for (const file of files) {
      const dataBase64 = await blobToBase64(file.blob);
      serializedFiles.push({
        id: file.id,
        classId: file.classId,
        studentId: file.studentId,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        dataBase64,
        createdAt: file.createdAt,
      });
    }

    const payload: BackupPayload = {
      version: 1,
      appName: "TeacherAssistantLocal",
      exportedAt: new Date().toISOString(),
      data: {
        classes,
        classSchedules,
        students,
        assessments,
        grades,
        homework,
        detentions,
        notes,
        interventions,
        lessons,
        tasks,
        settings,
        files: serializedFiles,
      },
    };

    // Update last backup timestamp
    await settingsRepository.recordBackupNow();

    return payload;
  },

  /**
   * Export database and trigger a local file download without altering any existing data.
   */
  async exportAndDownloadBackup(): Promise<void> {
    const payload = await this.generateBackup();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });

    const nowStr = new Date().toISOString().split("T")[0];
    const filename = `teacher-assistant-backup-${nowStr}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Inspects a candidate backup file against the active IndexedDB database
   * to determine if any local data was created or edited after the backup's export timestamp.
   */
  async inspectBackup(jsonString: string): Promise<BackupInspectionResult> {
    let payload: BackupPayload;
    try {
      payload = JSON.parse(jsonString) as BackupPayload;
    } catch {
      throw new Error("Invalid backup file: Not valid JSON format.");
    }

    if (!payload.data || !Array.isArray(payload.data.classes)) {
      throw new Error("Invalid backup structure: Missing required table data.");
    }

    const backupDate = payload.exportedAt || new Date().toISOString();
    const backupDateFormatted = formatDateTime(backupDate);

    const [
      classes,
      students,
      grades,
      homework,
      detentions,
      notes,
      interventions,
      lessons,
      tasks,
      files,
    ] = await Promise.all([
      db.classes.toArray(),
      db.students.toArray(),
      db.grades.toArray(),
      db.homework.toArray(),
      db.detentions.toArray(),
      db.notes.toArray(),
      db.interventions.toArray(),
      db.lessons.toArray(),
      db.tasks.toArray(),
      db.files.toArray(),
    ]);

    const isNewer = (item: { createdAt?: string; updatedAt?: string }) => {
      const date = item.updatedAt || item.createdAt;
      return Boolean(date && date > backupDate);
    };

    const newerBreakdown: NewerLocalDataStats = {
      classes: classes.filter(isNewer).length,
      students: students.filter(isNewer).length,
      grades: grades.filter(isNewer).length,
      homework: homework.filter(isNewer).length,
      detentions: detentions.filter(isNewer).length,
      notes: notes.filter(isNewer).length,
      interventions: interventions.filter(isNewer).length,
      lessons: lessons.filter(isNewer).length,
      tasks: tasks.filter(isNewer).length,
      files: files.filter(isNewer).length,
    };

    const totalNewerLocalRecords = Object.values(newerBreakdown).reduce(
      (a, b) => a + b,
      0
    );

    const totalBackupRecords =
      (payload.data.classes?.length || 0) +
      (payload.data.students?.length || 0) +
      (payload.data.grades?.length || 0) +
      (payload.data.homework?.length || 0) +
      (payload.data.detentions?.length || 0) +
      (payload.data.notes?.length || 0) +
      (payload.data.interventions?.length || 0) +
      (payload.data.lessons?.length || 0) +
      (payload.data.tasks?.length || 0) +
      (payload.data.files?.length || 0);

    return {
      backupDate,
      backupDateFormatted,
      totalBackupRecords,
      hasNewerLocalData: totalNewerLocalRecords > 0,
      totalNewerLocalRecords,
      newerBreakdown,
    };
  },

  /**
   * Atomic import of a backup payload, wiping existing tables and restoring all relationships and files
   */
  async importBackup(jsonString: string): Promise<{
    success: boolean;
    stats: Record<string, number>;
  }> {
    let payload: BackupPayload;

    try {
      payload = JSON.parse(jsonString) as BackupPayload;
    } catch {
      throw new Error("Invalid backup file: Not valid JSON format.");
    }

    if (!payload.data || !Array.isArray(payload.data.classes)) {
      throw new Error("Invalid backup structure: Missing required table data.");
    }

    const {
      classes = [],
      classSchedules = [],
      students = [],
      assessments = [],
      grades = [],
      homework = [],
      detentions = [],
      notes = [],
      interventions = [],
      lessons = [],
      tasks = [],
      settings = [],
      files = [],
    } = payload.data;

    // Convert serialized Base64 files back to native Blobs
    const restoredFiles: StoredFile[] = files.map((f) => ({
      id: f.id,
      classId: f.classId,
      studentId: f.studentId,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      blob: base64ToBlob(f.dataBase64, f.mimeType),
      createdAt: f.createdAt,
    }));

    // Perform atomic transaction across all tables
    await db.transaction(
      "rw",
      [
        db.classes,
        db.classSchedules,
        db.students,
        db.assessments,
        db.grades,
        db.homework,
        db.detentions,
        db.notes,
        db.interventions,
        db.lessons,
        db.tasks,
        db.settings,
        db.files,
      ],
      async () => {
        // Clear all tables
        await Promise.all([
          db.classes.clear(),
          db.classSchedules.clear(),
          db.students.clear(),
          db.assessments.clear(),
          db.grades.clear(),
          db.homework.clear(),
          db.detentions.clear(),
          db.notes.clear(),
          db.interventions.clear(),
          db.lessons.clear(),
          db.tasks.clear(),
          db.settings.clear(),
          db.files.clear(),
        ]);

        // Bulk insert restored data
        if (classes.length > 0) await db.classes.bulkAdd(classes);
        if (classSchedules.length > 0) await db.classSchedules.bulkAdd(classSchedules);
        if (students.length > 0) await db.students.bulkAdd(students);
        if (assessments.length > 0) await db.assessments.bulkAdd(assessments);
        if (grades.length > 0) await db.grades.bulkAdd(grades);
        if (homework.length > 0) await db.homework.bulkAdd(homework);
        if (detentions.length > 0) await db.detentions.bulkAdd(detentions);
        if (notes.length > 0) await db.notes.bulkAdd(notes);
        if (interventions.length > 0) await db.interventions.bulkAdd(interventions);
        if (lessons.length > 0) await db.lessons.bulkAdd(lessons);
        if (tasks.length > 0) await db.tasks.bulkAdd(tasks);
        if (settings.length > 0) await db.settings.bulkAdd(settings);
        if (restoredFiles.length > 0) await db.files.bulkAdd(restoredFiles);
      }
    );

    await settingsRepository.recordBackupNow();

    return {
      success: true,
      stats: {
        classes: classes.length,
        classSchedules: classSchedules.length,
        students: students.length,
        assessments: assessments.length,
        grades: grades.length,
        homework: homework.length,
        detentions: detentions.length,
        notes: notes.length,
        interventions: interventions.length,
        lessons: lessons.length,
        tasks: tasks.length,
        files: restoredFiles.length,
      },
    };
  },
};
