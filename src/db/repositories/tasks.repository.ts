import { db } from "../database";
import type { Task } from "@/types/database";

export const tasksRepository = {
  async getAll(): Promise<Task[]> {
    return db.tasks.orderBy("dueDate").toArray();
  },

  async getPending(): Promise<Task[]> {
    return db.tasks
      .filter((t) => !t.completed)
      .sortBy("dueDate");
  },

  async getByClassId(classId: number): Promise<Task[]> {
    return db.tasks.where("classId").equals(classId).sortBy("dueDate");
  },

  async getByStudentId(studentId: number): Promise<Task[]> {
    return db.tasks.where("studentId").equals(studentId).sortBy("dueDate");
  },

  async create(
    data: Omit<Task, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.tasks.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<Task>): Promise<number> {
    const now = new Date().toISOString();
    return db.tasks.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  async toggleComplete(id: number, completed: boolean): Promise<number> {
    const now = new Date().toISOString();
    return db.tasks.update(id, {
      completed,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    await db.tasks.delete(id);
  },
};
