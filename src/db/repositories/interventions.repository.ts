import { db } from "../database";
import type { Intervention, InterventionType } from "@/types/database";

export const interventionsRepository = {
  async getAll(): Promise<Intervention[]> {
    return db.interventions.orderBy("date").reverse().toArray();
  },

  async getById(id: number): Promise<Intervention | undefined> {
    return db.interventions.get(id);
  },

  async getByStudentId(
    studentId: number,
    type?: InterventionType
  ): Promise<Intervention[]> {
    const collection = db.interventions.where("studentId").equals(studentId);
    if (type && type !== "all") {
      return collection.filter((i) => i.type === type).reverse().sortBy("date");
    }
    return collection.reverse().sortBy("date");
  },

  async getByClassId(classId: number): Promise<Intervention[]> {
    return db.interventions.where("classId").equals(classId).reverse().sortBy("date");
  },

  async countByStudentId(studentId: number): Promise<number> {
    return db.interventions.where("studentId").equals(studentId).count();
  },

  async create(
    data: Omit<Intervention, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.interventions.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<Intervention>): Promise<number> {
    const now = new Date().toISOString();
    return db.interventions.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  async updateEffectiveness(id: number, effectiveness: number): Promise<number> {
    const now = new Date().toISOString();
    return db.interventions.update(id, {
      effectiveness: Math.max(1, Math.min(5, Math.round(effectiveness))),
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    await db.interventions.delete(id);
  },
};
