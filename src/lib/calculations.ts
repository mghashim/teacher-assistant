import type { Grade, Assessment, ClassSchedule, DayOfWeek } from "@/types/database";

/**
 * Calculate grade percentage
 */
export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round(((score / maxScore) * 100) * 10) / 10;
}

/**
 * Format percentage string (e.g. "87.5%")
 */
export function formatPercentage(score: number, maxScore: number): string {
  if (maxScore <= 0) return "0%";
  return `${calculatePercentage(score, maxScore)}%`;
}

/**
 * Calculate the average score/percentage for an assessment across all graded students
 */
export function calculateAssessmentAverage(
  grades: Grade[],
  assessment: Assessment
): { averageScore: number; averagePercentage: number; gradedCount: number } {
  if (!grades || grades.length === 0 || assessment.maxScore <= 0) {
    return { averageScore: 0, averagePercentage: 0, gradedCount: 0 };
  }

  const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
  const averageScore = Math.round((totalScore / grades.length) * 10) / 10;
  const averagePercentage = calculatePercentage(averageScore, assessment.maxScore);

  return {
    averageScore,
    averagePercentage,
    gradedCount: grades.length,
  };
}

/**
 * Calculate average percentage across multiple assessments for a student
 */
export function calculateStudentOverallAverage(
  studentGrades: Grade[],
  assessmentsMap: Map<number, Assessment>
): number {
  let totalPercent = 0;
  let validCount = 0;

  for (const grade of studentGrades) {
    const assessment = assessmentsMap.get(grade.assessmentId);
    if (assessment && assessment.maxScore > 0) {
      totalPercent += (grade.score / assessment.maxScore) * 100;
      validCount++;
    }
  }

  if (validCount === 0) return 0;
  return Math.round((totalPercent / validCount) * 10) / 10;
}

/**
 * Helper to determine the day of week string matching DayOfWeek
 */
export function getDayOfWeekFromDate(date: Date = new Date()): DayOfWeek {
  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getDay()];
}

/**
 * Sorts class schedules chronologically for display
 */
export function sortSchedulesByTime(schedules: ClassSchedule[]): ClassSchedule[] {
  const dayOrder: Record<DayOfWeek, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };

  return [...schedules].sort((a, b) => {
    const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
}
