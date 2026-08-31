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
    const allStudents = await db.students.toArray();
    return allStudents
      .filter((s) => {
        const enrolled =
          (Array.isArray(s.classIds) && s.classIds.includes(classId)) ||
          s.classId === classId;
        return enrolled && (activeOnly ? s.active : true);
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  },

  async search(query: string, classId?: number): Promise<Student[]> {
    const q = query.trim().toLowerCase();
    const allStudents = await db.students.toArray();

    return allStudents
      .filter((student) => {
        if (classId !== undefined) {
          const enrolled =
            (Array.isArray(student.classIds) && student.classIds.includes(classId)) ||
            student.classId === classId;
          if (!enrolled) return false;
        }
        const full = `${student.firstName} ${student.lastName} ${student.preferredName || ""}`.toLowerCase();
        const email = (student.email || "").toLowerCase();
        const parent = (student.parentName || "").toLowerCase();
        return full.includes(q) || email.includes(q) || parent.includes(q);
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  },

  async enrollStudentInClass(studentId: number, classId: number): Promise<void> {
    const student = await db.students.get(studentId);
    if (!student) return;

    const currentIds = Array.isArray(student.classIds) && student.classIds.length > 0
      ? student.classIds
      : (student.classId ? [student.classId] : []);

    if (!currentIds.includes(classId)) {
      const newClassIds = [...currentIds, classId];
      const now = new Date().toISOString();
      await db.students.update(studentId, {
        classIds: newClassIds,
        classId: student.classId || classId,
        updatedAt: now,
      });
    }
  },

  async unenrollStudentFromClass(studentId: number, classId: number): Promise<void> {
    const student = await db.students.get(studentId);
    if (!student) return;

    const currentIds = Array.isArray(student.classIds) && student.classIds.length > 0
      ? student.classIds
      : (student.classId ? [student.classId] : []);

    const newClassIds = currentIds.filter((id) => id !== classId);
    const newPrimaryClassId = newClassIds.length > 0 ? newClassIds[0] : 0;
    const now = new Date().toISOString();

    await db.students.update(studentId, {
      classIds: newClassIds,
      classId: newPrimaryClassId,
      updatedAt: now,
    });
  },

  async create(
    data: Omit<Student, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const now = new Date().toISOString();
    const classIds = Array.isArray(data.classIds) && data.classIds.length > 0
      ? data.classIds
      : (data.classId ? [data.classId] : []);
    const classId = classIds.length > 0 ? classIds[0] : data.classId || 0;

    return db.students.add({
      ...data,
      classId,
      classIds,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<Student>): Promise<number> {
    const now = new Date().toISOString();
    const payload: Partial<Student> = { ...data, updatedAt: now };

    if (data.classIds !== undefined) {
      payload.classIds = data.classIds;
      if (data.classIds.length > 0 && !data.classId) {
        payload.classId = data.classIds[0];
      }
    } else if (data.classId !== undefined && data.classIds === undefined) {
      const current = await db.students.get(id);
      if (current) {
        const currentIds = Array.isArray(current.classIds) ? current.classIds : [];
        if (!currentIds.includes(data.classId)) {
          payload.classIds = [data.classId, ...currentIds];
        }
      }
    }

    return db.students.update(id, payload);
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

