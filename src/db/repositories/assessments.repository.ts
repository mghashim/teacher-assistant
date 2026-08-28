import { db } from "../database";
import type { Assessment } from "@/types/database";

export const assessmentsRepository = {
  async getAll(): Promise<Assessment[]> {
    return db.assessments.orderBy("assessmentDate").reverse().toArray();
  },

  async getById(id: number): Promise<Assessment | undefined> {
    return db.assessments.get(id);
  },

  async getByClassId(classId: number): Promise<Assessment[]> {
    return db.assessments.where("classId").equals(classId).toArray();
  },

  async create(
    data: Omit<Assessment, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.assessments.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<Assessment>): Promise<number> {
    const now = new Date().toISOString();
    return db.assessments.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  /**
   * Cascade delete an assessment and all associated grades
   */
  async deleteCascade(id: number): Promise<void> {
    await db.transaction("rw", [db.assessments, db.grades], async () => {
      await db.grades.where("assessmentId").equals(id).delete();
      await db.assessments.delete(id);
    });
  },
};
