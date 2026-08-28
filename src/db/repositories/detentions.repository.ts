import { db } from "../database";
import type { Detention } from "@/types/database";

export const detentionsRepository = {
  async getAll(): Promise<Detention[]> {
    return db.detentions.orderBy("detentionDate").reverse().toArray();
  },

  async getById(id: number): Promise<Detention | undefined> {
    return db.detentions.get(id);
  },

  async getByStudentId(studentId: number): Promise<Detention[]> {
    return db.detentions.where("studentId").equals(studentId).reverse().sortBy("detentionDate");
  },

  async getByClassId(classId: number): Promise<Detention[]> {
    return db.detentions.where("classId").equals(classId).reverse().sortBy("detentionDate");
  },

  async getCountByStudentId(studentId: number): Promise<number> {
    return db.detentions.where("studentId").equals(studentId).count();
  },

  async create(
    data: Omit<Detention, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.detentions.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<Detention>): Promise<number> {
    const now = new Date().toISOString();
    return db.detentions.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    await db.detentions.delete(id);
  },
};
