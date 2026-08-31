import { db } from "../database";
import type { Student } from "@/types/database";

export const studentsRepository = {
  async getAll(activeOnly = false): Promise<Student[]> {
    if (activeOnly) {
      return db.students.filter((s) => s.active).toArray();
    }
    return db.students.orderBy("lastName").toArray();
  },

  async getById(id: number): Promise<Student | undefined> {
    return db.students.get(id);
  },

  async getByClassId(classId: number, activeOnly = false): Promise<Student[]> {
    if (activeOnly) {
      return db.students
        .where("classId")
        .equals(classId)
        .filter((s) => s.active)
        .sortBy("lastName");
    }
    return db.students.where("classId").equals(classId).sortBy("lastName");
  },

  async search(query: string, classId?: number): Promise<Student[]> {
    const q = query.trim().toLowerCase();
    let collection = db.students.toCollection();

    if (classId !== undefined) {
      collection = db.students.where("classId").equals(classId);
    }

    return collection
      .filter((student) => {
        const full = `${student.firstName} ${student.lastName} ${student.preferredName || ""}`.toLowerCase();
        return full.includes(q);
      })
      .toArray();
  },

  async create(
    data: Omit<Student, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.students.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<Student>): Promise<number> {
    const now = new Date().toISOString();
    return db.students.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  /**
   * Cascade delete a single student and all associated records:
   * grades, homework, detentions, teacher notes, interventions, stored files, and tasks.
   */
  async deleteCascade(id: number): Promise<void> {
    await db.transaction(
      "rw",
      [
        db.students,
        db.grades,
        db.homework,
        db.detentions,
        db.notes,
        db.interventions,
        db.files,
        db.tasks,
      ],
      async () => {
        await db.grades.where("studentId").equals(id).delete();
        await db.homework.where("studentId").equals(id).delete();
        await db.detentions.where("studentId").equals(id).delete();
        await db.notes.where("studentId").equals(id).delete();
        await db.interventions.where("studentId").equals(id).delete();
        await db.files.where("studentId").equals(id).delete();
        await db.tasks.where("studentId").equals(id).delete();
        await db.students.delete(id);
      }
    );
  },
};

