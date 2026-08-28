import { db } from "../database";
import type { TeacherNote, NoteCategory } from "@/types/database";

export const notesRepository = {
  async getByStudentId(
    studentId: number,
    category?: NoteCategory
  ): Promise<TeacherNote[]> {
    let collection = db.notes.where("studentId").equals(studentId);
    if (category) {
      return collection.filter((n) => n.category === category).reverse().sortBy("noteDate");
    }
    return collection.reverse().sortBy("noteDate");
  },

  async getById(id: number): Promise<TeacherNote | undefined> {
    return db.notes.get(id);
  },

  async create(
    data: Omit<TeacherNote, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.notes.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<TeacherNote>): Promise<number> {
    const now = new Date().toISOString();
    return db.notes.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    await db.notes.delete(id);
  },
};
