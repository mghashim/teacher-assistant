import { db } from "../database";
import type { TeacherClass } from "@/types/database";

export const classesRepository = {
  async getAll(): Promise<TeacherClass[]> {
    return db.classes.orderBy("name").toArray();
  },

  async getById(id: number): Promise<TeacherClass | undefined> {
    return db.classes.get(id);
  },

  async create(
    data: Omit<TeacherClass, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    return db.classes.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<TeacherClass>): Promise<number> {
    const now = new Date().toISOString();
    return db.classes.update(id, {
      ...data,
      updatedAt: now,
    });
  },

  /**
   * Cascade delete a class and all associated records:
   * schedules, students (plus their grades, homework, detentions, notes, files),
   * assessments (plus their grades), class files, and class tasks.
   */
  async deleteCascade(id: number): Promise<void> {
    await db.transaction(
      "rw",
      [
        db.classes,
        db.classSchedules,
        db.students,
        db.assessments,
        db.grades,
        db.homework,
        db.detentions,
        db.notes,
        db.files,
        db.tasks,
      ],
      async () => {
        // 1. Find all student IDs in this class
        const students = await db.students.where("classId").equals(id).toArray();
        const studentIds = students.map((s) => s.id!).filter(Boolean);

        // 2. Find all assessment IDs in this class
        const assessments = await db.assessments.where("classId").equals(id).toArray();
        const assessmentIds = assessments.map((a) => a.id!).filter(Boolean);

        // 3. Delete grades associated with assessments or students
        if (assessmentIds.length > 0) {
          await db.grades.where("assessmentId").anyOf(assessmentIds).delete();
        }
        if (studentIds.length > 0) {
          await db.grades.where("studentId").anyOf(studentIds).delete();
          await db.homework.where("studentId").anyOf(studentIds).delete();
          await db.detentions.where("studentId").anyOf(studentIds).delete();
          await db.notes.where("studentId").anyOf(studentIds).delete();
          await db.files.where("studentId").anyOf(studentIds).delete();
          await db.tasks.where("studentId").anyOf(studentIds).delete();
        }

        // 4. Delete homework & detentions assigned to the class directly
        await db.homework.where("classId").equals(id).delete();
        await db.detentions.where("classId").equals(id).delete();

        // 5. Delete class-level schedules, assessments, files, tasks, and students
        await db.classSchedules.where("classId").equals(id).delete();
        await db.assessments.where("classId").equals(id).delete();
        await db.files.where("classId").equals(id).delete();
        await db.tasks.where("classId").equals(id).delete();
        await db.students.where("classId").equals(id).delete();

        // 6. Delete the class itself
        await db.classes.delete(id);
      }
    );
  },
};
