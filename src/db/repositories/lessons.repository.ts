import { db } from "../database";
import type { ClassLesson, LessonStatus } from "@/types/database";

export const lessonsRepository = {
  async getAll(): Promise<ClassLesson[]> {
    return db.lessons.orderBy("orderIndex").toArray();
  },

  async getById(id: number): Promise<ClassLesson | undefined> {
    return db.lessons.get(id);
  },

  async getByClassId(classId: number): Promise<ClassLesson[]> {
    return db.lessons
      .where("classId")
      .equals(classId)
      .sortBy("orderIndex");
  },

  async create(
    data: Omit<ClassLesson, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.lessons.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<ClassLesson>): Promise<number> {
    const now = new Date().toISOString();
    return db.lessons.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  async updateStatus(id: number, status: LessonStatus): Promise<number> {
    const now = new Date().toISOString();
    return db.lessons.update(id, {
      status,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    return db.lessons.delete(id);
  },

  async reorder(lessonIds: number[]): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction("rw", db.lessons, async () => {
      for (let i = 0; i < lessonIds.length; i++) {
        await db.lessons.update(lessonIds[i], {
          orderIndex: i + 1,
          lessonNumber: i + 1,
          updatedAt: now,
        });
      }
    });
  },
};
