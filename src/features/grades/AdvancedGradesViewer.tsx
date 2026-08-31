import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { calculatePercentage } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import { exportGradesToExcelXml, exportGradesToCsv } from "@/lib/excelExport";
import { Award, User, FileSpreadsheet, Download } from "lucide-react";
import type {
  TeacherClass,
  Student,
  Assessment,
  Grade,
  Homework,
} from "@/types/database";
import type { GradesFilterState } from "./GradesFilterPanel";

interface AdvancedGradesViewerProps {
  classes: TeacherClass[];
  students: Student[];
  assessments: Assessment[];
  grades: Grade[];
  homework: Homework[];
  filters: GradesFilterState;
}

export function AdvancedGradesViewer({
  classes,
  students,
  assessments,
  grades,
  homework,
  filters,
}: AdvancedGradesViewerProps) {
  // 1. Filter students
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (filters.classIds.length > 0) {
          const cIds =
            Array.isArray(s.classIds) && s.classIds.length > 0
              ? s.classIds
              : s.classId
              ? [s.classId]
              : [];
          if (!cIds.some((id) => filters.classIds.includes(id))) {
            return false;
          }
        }
        if (filters.studentIds.length > 0 && !filters.studentIds.includes(s.id!)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, filters.classIds, filters.studentIds]);

  // 2. Filter assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (filters.classIds.length > 0 && !filters.classIds.includes(a.classId)) {
        return false;
      }
      if (filters.assessmentTypes.length > 0 && !filters.assessmentTypes.includes(a.type)) {
        return false;
      }
      if (filters.assessmentIds.length > 0 && !filters.assessmentIds.includes(a.id!)) {
        return false;
      }
      if (filters.dateFrom && a.assessmentDate && a.assessmentDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && a.assessmentDate && a.assessmentDate > filters.dateTo) {
        return false;
      }
      return true;
    }).sort((a, b) => (a.assessmentDate || "").localeCompare(b.assessmentDate || ""));
  }, [
    assessments,
    filters.classIds,
    filters.assessmentTypes,
    filters.assessmentIds,
    filters.dateFrom,
    filters.dateTo,
  ]);

  // Map for rapid grade lookups: `${studentId}_${assessmentId}` -> Grade
  const gradeLookup = useMemo(() => {
    const map = new Map<string, Grade>();
    grades.forEach((g) => {
      map.set(`${g.studentId}_${g.assessmentId}`, g);
    });
    return map;
  }, [grades]);

  // Class lookup
  const classMap = useMemo(() => {
    const map = new Map<number, string>();
    classes.forEach((c) => {
      if (c.id) map.set(c.id, c.name);
    });
    return map;
  }, [classes]);

  // Calculate assessment column averages
  const assessmentAverages = useMemo(() => {
    return filteredAssessments.map((assessment) => {
      const relevantGrades = filteredStudents
        .map((s) => gradeLookup.get(`${s.id}_${assessment.id}`))
        .filter((g): g is Grade => Boolean(g));

      if (relevantGrades.length > 0 && assessment.maxScore > 0) {
        const totalScore = relevantGrades.reduce((sum, g) => sum + g.score, 0);
        const averageScore = Math.round((totalScore / relevantGrades.length) * 10) / 10;
        const averagePercentage = calculatePercentage(averageScore, assessment.maxScore);

        return {
          averageScore,
          averagePercentage,
          count: relevantGrades.length,
        };
      }

      return { averageScore: 0, averagePercentage: 0, count: 0 };
    });
  }, [filteredAssessments, filteredStudents, gradeLookup]);

  const handleExportExcel = () => {
    exportGradesToExcelXml({
      classes,
      filteredStudents,
      filteredAssessments,
      grades,
      homework,
      filters,
      classMap,
      gradeLookup,
    });
  };

  const handleExportCsv = () => {
    exportGradesToCsv({
      classes,
      filteredStudents,
      filteredAssessments,
      grades,
      homework,
      filters,
      classMap,
      gradeLookup,
    });
  };

  if (filteredStudents.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="No students match the selected filters"
        description="Try expanding your class selection or clearing specific student filters."
      />
    );
  }

  if (filteredAssessments.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No assessments match the selected filters"
        description="Try clearing assessment type filters or date ranges."
      />
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden space-y-0">
      <div className="p-4 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">
            Displaying {filteredStudents.length} Students × {filteredAssessments.length} Assessments
          </span>
          <span className="text-muted-foreground">• Matrix Grade View</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-muted-foreground mr-2">
            <span>Columns:</span>
            {filters.columns.score && <Badge variant="secondary" className="text-[10px]">Score</Badge>}
            {filters.columns.percentage && <Badge variant="secondary" className="text-[10px]">Percentage</Badge>}
            {filters.columns.average && <Badge variant="secondary" className="text-[10px]">Average</Badge>}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs h-8"
            title="Download filtered grades as universal CSV"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            title="Download formatted Excel spreadsheet based on current filters"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Excel (.xls)</span>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/70 border-b text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              {/* Fixed Student Info Column */}
              <th className="px-4 py-3 sticky left-0 bg-muted/95 z-20 shadow-[1px_0_0_0_hsl(var(--border))] min-w-[200px]">
                Student Name
              </th>

              {/* Dynamic Assessment Columns */}
              {filteredAssessments.map((assessment) => (
                <th
                  key={assessment.id}
                  className="px-4 py-3 border-l text-center min-w-[140px]"
                >
                  <div className="font-bold text-foreground capitalize truncate max-w-[180px]">
                    {assessment.title}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-normal text-muted-foreground mt-0.5">
                    <span className="uppercase font-mono">{assessment.type}</span>
                    {filters.columns.maxMark && (
                      <span>• Max: {assessment.maxScore}</span>
                    )}
                    {filters.columns.date && assessment.assessmentDate && (
                      <span>• {formatDate(assessment.assessmentDate)}</span>
                    )}
                  </div>
                </th>
              ))}

              {/* Student Average Column */}
              {filters.columns.average && (
                <th className="px-4 py-3 border-l text-center bg-primary/5 min-w-[120px] font-bold text-primary">
                  Student Average
                </th>
              )}

              {/* Homework Approval Rate Column */}
              {filters.columns.homeworkApproval && (
                <th className="px-4 py-3 border-l text-center min-w-[120px]">
                  HW Approval
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {filteredStudents.map((student) => {
              // Calculate this student's individual average across visible filtered assessments
              let studentTotalPct = 0;
              let gradedAssessmentsCount = 0;

              return (
                <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                  {/* Student Name */}
                  <td className="px-4 py-3 sticky left-0 bg-card z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
                    <Link
                      to={`/students/${student.id}`}
                      className="font-bold text-foreground hover:text-primary transition-colors block truncate"
                    >
                      {student.lastName}, {student.firstName}
                      {student.preferredName && (
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">
                          ({student.preferredName})
                        </span>
                      )}
                    </Link>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {(Array.isArray(student.classIds) && student.classIds.length > 0
                        ? student.classIds
                        : student.classId
                        ? [student.classId]
                        : []
                      )
                        .map((id) => classMap.get(id))
                        .filter(Boolean)
                        .join(", ") || "Class"}
                    </span>
                  </td>

                  {/* Assessment Cells */}
                  {filteredAssessments.map((assessment) => {
                    const grade = gradeLookup.get(`${student.id}_${assessment.id}`);
                    const score = grade?.score;
                    const max = assessment.maxScore;
                    const pct =
                      score !== undefined ? calculatePercentage(score, max) : null;

                    if (pct !== null) {
                      studentTotalPct += pct;
                      gradedAssessmentsCount++;
                    }

                    return (
                      <td
                        key={assessment.id}
                        className="px-4 py-3 border-l text-center font-mono"
                      >
                        {score !== undefined ? (
                          <div className="flex flex-col items-center justify-center">
                            {filters.columns.score && (
                              <span className="text-xs font-semibold text-foreground">
                                {score}
                                {filters.columns.maxMark && (
                                  <span className="text-muted-foreground font-normal">
                                    /{max}
                                  </span>
                                )}
                              </span>
                            )}
                            {filters.columns.percentage && (
                              <span
                                className={`text-[11px] font-bold ${
                                  pct! >= 75
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : pct! >= 50
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {pct}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Student Average */}
                  {filters.columns.average && (
                    <td className="px-4 py-3 border-l text-center bg-primary/5 font-bold font-mono">
                      {gradedAssessmentsCount > 0 ? (
                        <span className="text-primary font-bold">
                          {Math.round((studentTotalPct / gradedAssessmentsCount) * 10) / 10}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  )}

                  {/* Homework Approval Rate */}
                  {filters.columns.homeworkApproval && (
                    <td className="px-4 py-3 border-l text-center">
                      {(() => {
                        const studentHw = homework.filter((h) => h.studentId === student.id);
                        if (studentHw.length === 0) return <span className="text-muted-foreground">—</span>;
                        const approved = studentHw.filter((h) => h.approved).length;
                        const rate = Math.round((approved / studentHw.length) * 100);
                        return (
                          <span
                            className={`font-semibold text-xs ${
                              rate >= 80
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {rate}% ({approved}/{studentHw.length})
                          </span>
                        );
                      })()}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Assessment Class Averages Footer */}
          <tfoot>
            <tr className="bg-muted/60 border-t font-semibold text-xs">
              <td className="px-4 py-3 sticky left-0 bg-muted/90 z-10 shadow-[1px_0_0_0_hsl(var(--border))] font-bold text-foreground">
                Class Assessment Averages
              </td>

              {assessmentAverages.map((stat, idx) => (
                <td
                  key={idx}
                  className="px-4 py-3 border-l text-center font-mono font-bold text-foreground"
                >
                  {stat.count > 0 ? (
                    <div>
                      {filters.columns.score && <span>{stat.averageScore}</span>}
                      {filters.columns.percentage && (
                        <span className="text-primary ml-1">
                          ({stat.averagePercentage}%)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              ))}

              {filters.columns.average && (
                <td className="px-4 py-3 border-l text-center bg-primary/10 text-primary font-bold">
                  —
                </td>
              )}

              {filters.columns.homeworkApproval && (
                <td className="px-4 py-3 border-l text-center">
                  —
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
