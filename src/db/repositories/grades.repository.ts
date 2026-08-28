import { db } from "../database";
import type { Grade } from "@/types/database";

export const gradesRepository = {
  async getByAssessmentId(assessmentId: number): Promise<Grade[]> {
    return db.grades.where("assessmentId").equals(assessmentId).toArray();
  },

  async getByStudentId(studentId: number): Promise<Grade[]> {
    return db.grades.where("studentId").equals(studentId).toArray();
  },

  async getByAssessmentAndStudent(
    assessmentId: number,
    studentId: number
  ): Promise<Grade | undefined> {
    return db.grades
      .where("[assessmentId+studentId]")
      .equals([assessmentId, studentId])
      .first();
  },

  /**
   * Upsert a grade for a student and assessment.
   * If a grade already exists, update score & feedback. Otherwise, create a new record.
   */
  async upsertGrade(params: {
    assessmentId: number;
    studentId: number;
    score: number;
    feedback?: string;
  }): Promise<number> {
    const existing = await this.getByAssessmentAndStudent(
      params.assessmentId,
      params.studentId
    );

    const now = new Date().toISOString();

    if (existing && existing.id) {
      await db.grades.update(existing.id, {
        score: params.score,
        feedback: params.feedback,
        updatedAt: now,
      });
      return existing.id;
    }

    return db.grades.add({
      assessmentId: params.assessmentId,
      studentId: params.studentId,
      score: params.score,
      feedback: params.feedback,
      createdAt: now,
      updatedAt: now,
    });
  },

  /**
   * Batch upsert grades within a single fast transaction
   */
  async batchUpsertGrades(
    items: Array<{
      assessmentId: number;
      studentId: number;
      score: number;
      feedback?: string;
    }>
  ): Promise<void> {
    const now = new Date().toISOString();

    await db.transaction("rw", db.grades, async () => {
      for (const item of items) {
        const existing = await db.grades
          .where("[assessmentId+studentId]")
          .equals([item.assessmentId, item.studentId])
          .first();

        if (existing && existing.id) {
          await db.grades.update(existing.id, {
            score: item.score,
            feedback: item.feedback,
            updatedAt: now,
          });
        } else {
          await db.grades.add({
            assessmentId: item.assessmentId,
            studentId: item.studentId,
            score: item.score,
            feedback: item.feedback,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });
  },

  async delete(id: number): Promise<void> {
    await db.grades.delete(id);
  },
};
