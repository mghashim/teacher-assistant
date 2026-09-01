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
        db.interventions,
        db.lessons,
        db.files,
        db.tasks,
      ],
      async () => {
        // 1. Find all students enrolled in this class
        const allStudents = await db.students.toArray();
        const enrolledStudents = allStudents.filter(
          (s) =>
            (Array.isArray(s.classIds) && s.classIds.includes(id)) ||
            s.classId === id
        );

        // Students whose only class is this one vs students enrolled in other classes too
        const singleClassStudentIds: number[] = [];

        for (const student of enrolledStudents) {
          if (!student.id) continue;
          const currentIds = Array.isArray(student.classIds) && student.classIds.length > 0
            ? student.classIds
            : (student.classId ? [student.classId] : []);

          const remaining = currentIds.filter((cId) => cId !== id);

          if (remaining.length === 0) {
            singleClassStudentIds.push(student.id);
          } else {
            // Unlink class from multi-class student
            await db.students.update(student.id, {
              classIds: remaining,
              classId: remaining[0],
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 2. Find all assessment IDs in this class
        const assessments = await db.assessments.where("classId").equals(id).toArray();
        const assessmentIds = assessments.map((a) => a.id!).filter(Boolean);

        // 3. Delete grades associated with assessments or single-class deleted students
        if (assessmentIds.length > 0) {
          await db.grades.where("assessmentId").anyOf(assessmentIds).delete();
        }
        if (singleClassStudentIds.length > 0) {
          await db.grades.where("studentId").anyOf(singleClassStudentIds).delete();
          await db.homework.where("studentId").anyOf(singleClassStudentIds).delete();
          await db.detentions.where("studentId").anyOf(singleClassStudentIds).delete();
          await db.notes.where("studentId").anyOf(singleClassStudentIds).delete();
          await db.interventions.where("studentId").anyOf(singleClassStudentIds).delete();
          await db.files.where("studentId").anyOf(singleClassStudentIds).delete();
          await db.tasks.where("studentId").anyOf(singleClassStudentIds).delete();
          await db.students.where("id").anyOf(singleClassStudentIds).delete();
        }

        // 4. Delete homework, detentions & interventions assigned to the class directly
        await db.homework.where("classId").equals(id).delete();
        await db.detentions.where("classId").equals(id).delete();
        await db.interventions.where("classId").equals(id).delete();

        // 5. Delete class-level schedules, assessments, lessons, files, and tasks
        await db.classSchedules.where("classId").equals(id).delete();
        await db.assessments.where("classId").equals(id).delete();
        await db.lessons.where("classId").equals(id).delete();
        await db.files.where("classId").equals(id).delete();
        await db.tasks.where("classId").equals(id).delete();

        // 6. Delete the class itself
        await db.classes.delete(id);
      }
    );
  },
};
