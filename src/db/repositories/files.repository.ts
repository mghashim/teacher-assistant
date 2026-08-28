import { db } from "../database";
import type { StoredFile, StoredFileMetadata } from "@/types/database";

export const filesRepository = {
  /**
   * Fetch file metadata for a student (avoids keeping unnecessary blob references in memory)
   */
  async getMetadataByStudentId(studentId: number): Promise<StoredFileMetadata[]> {
    const files = await db.files.where("studentId").equals(studentId).toArray();
    return files.map(({ id, classId, studentId: sId, name, mimeType, size, createdAt }) => ({
      id,
      classId,
      studentId: sId,
      name,
      mimeType,
      size,
      createdAt,
    }));
  },

  /**
   * Fetch file metadata for a class
   */
  async getMetadataByClassId(classId: number): Promise<StoredFileMetadata[]> {
    const files = await db.files.where("classId").equals(classId).toArray();
    return files.map(({ id, classId: cId, studentId, name, mimeType, size, createdAt }) => ({
      id,
      classId: cId,
      studentId,
      name,
      mimeType,
      size,
      createdAt,
    }));
  },

  /**
   * Fetch full file record including Blob (only when viewing/downloading/previewing)
   */
  async getFileWithBlob(id: number): Promise<StoredFile | undefined> {
    return db.files.get(id);
  },

  async uploadFile(params: {
    name: string;
    mimeType: string;
    size: number;
    blob: Blob;
    classId?: number;
    studentId?: number;
  }): Promise<number> {
    const now = new Date().toISOString();
    return db.files.add({
      ...params,
      createdAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    await db.files.delete(id);
  },

  /**
   * Offline native download trigger
   */
  downloadFile(file: StoredFile): void {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },
};
