import { db } from "../database";
import type { Homework } from "@/types/database";

export const homeworkRepository = {
  async getAll(): Promise<Homework[]> {
    return db.homework.orderBy("homeworkDate").reverse().toArray();
  },

  async getById(id: number): Promise<Homework | undefined> {
    return db.homework.get(id);
  },

  async getByStudentId(studentId: number): Promise<Homework[]> {
    return db.homework.where("studentId").equals(studentId).reverse().sortBy("homeworkDate");
  },

  async getByClassId(classId: number): Promise<Homework[]> {
    return db.homework.where("classId").equals(classId).reverse().sortBy("homeworkDate");
  },

  async create(
    data: Omit<Homework, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.homework.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<Homework>): Promise<number> {
    const now = new Date().toISOString();
    return db.homework.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  async toggleApproval(id: number, approved: boolean): Promise<number> {
    const now = new Date().toISOString();
    return db.homework.update(id, {
      approved,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    await db.homework.delete(id);
  },
};
