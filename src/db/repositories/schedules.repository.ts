import { db } from "../database";
import type { ClassSchedule, DayOfWeek } from "@/types/database";

export const schedulesRepository = {
  async getAll(): Promise<ClassSchedule[]> {
    return db.classSchedules.toArray();
  },

  async getByClassId(classId: number): Promise<ClassSchedule[]> {
    return db.classSchedules.where("classId").equals(classId).toArray();
  },

  async getByDay(dayOfWeek: DayOfWeek): Promise<ClassSchedule[]> {
    return db.classSchedules.where("dayOfWeek").equals(dayOfWeek).sortBy("startTime");
  },

  async create(
    data: Omit<ClassSchedule, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.classSchedules.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<ClassSchedule>): Promise<number> {
    const now = new Date().toISOString();
    return db.classSchedules.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    await db.classSchedules.delete(id);
  },
};
