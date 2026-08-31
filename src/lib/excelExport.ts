import type {
  TeacherClass,
  Student,
  Assessment,
  Grade,
  Homework,
} from "@/types/database";
import type { GradesFilterState } from "@/features/grades/GradesFilterPanel";
import { calculatePercentage } from "./calculations";
import { formatDate } from "./utils";

/**
 * Escapes XML special characters for Excel Spreadsheet XML
 */
function escapeXml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Escapes CSV special characters and quotes
 */
function escapeCsv(cell: string | number | undefined | null): string {
  if (cell === undefined || cell === null) return "";
  const str = String(cell);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Trigger browser file download for generated text/blob
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

export interface ExportGradeMatrixParams {
  classes: TeacherClass[];
  filteredStudents: Student[];
  filteredAssessments: Assessment[];
  grades: Grade[];
  homework: Homework[];
  filters: GradesFilterState;
  classMap: Map<number, string>;
  gradeLookup: Map<string, Grade>;
}

/**
 * Exports the filtered grades matrix as a Microsoft Excel-compatible XML Spreadsheet (.xls)
 * Opens cleanly in Microsoft Excel, Apple Numbers, Google Sheets, LibreOffice, and Samsung Office.
 */
export function exportGradesToExcelXml({
  filteredStudents,
  filteredAssessments,
  homework,
  filters,
  classMap,
  gradeLookup,
}: ExportGradeMatrixParams) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const filename = `Grades-Matrix-Export-${dateStr}.xls`;

  // Build header row
  let headerCellsXml = `
    <Cell ss:StyleID="Header"><Data ss:Type="String">Student Last Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Student First Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Preferred Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Class</Data></Cell>
  `;

  filteredAssessments.forEach((assessment) => {
    const metaParts = [assessment.type.toUpperCase()];
    if (filters.columns.maxMark) metaParts.push(`Max: ${assessment.maxScore}`);
    if (filters.columns.date && assessment.assessmentDate) {
      metaParts.push(formatDate(assessment.assessmentDate));
    }
    const headerTitle = `${assessment.title} (${metaParts.join(" • ")})`;
    headerCellsXml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(headerTitle)}</Data></Cell>`;
  });

  if (filters.columns.average) {
    headerCellsXml += `<Cell ss:StyleID="HeaderAverage"><Data ss:Type="String">Student Overall Average (%)</Data></Cell>`;
  }

  if (filters.columns.homeworkApproval) {
    headerCellsXml += `<Cell ss:StyleID="Header"><Data ss:Type="String">Homework Approval Rate</Data></Cell>`;
  }

  // Build student rows
  let rowsXml = "";
  filteredStudents.forEach((student) => {
    let studentTotalPct = 0;
    let gradedCount = 0;

    let studentCellsXml = `
      <Cell ss:StyleID="TextBold"><Data ss:Type="String">${escapeXml(student.lastName)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(student.firstName)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(student.preferredName || "")}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(classMap.get(student.classId) || "Class")}</Data></Cell>
    `;

    filteredAssessments.forEach((assessment) => {
      const grade = gradeLookup.get(`${student.id}_${assessment.id}`);
      if (grade && grade.score !== undefined) {
        const pct = calculatePercentage(grade.score, assessment.maxScore);
        studentTotalPct += pct;
        gradedCount++;

        let cellDisplay = "";
        if (filters.columns.score && filters.columns.percentage) {
          cellDisplay = `${grade.score}/${assessment.maxScore} (${pct}%)`;
        } else if (filters.columns.score) {
          cellDisplay = `${grade.score}/${assessment.maxScore}`;
        } else if (filters.columns.percentage) {
          cellDisplay = `${pct}%`;
        } else {
          cellDisplay = `${grade.score}`;
        }

        studentCellsXml += `<Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(cellDisplay)}</Data></Cell>`;
      } else {
        studentCellsXml += `<Cell ss:StyleID="Center"><Data ss:Type="String">—</Data></Cell>`;
      }
    });

    if (filters.columns.average) {
      if (gradedCount > 0) {
        const avg = Math.round((studentTotalPct / gradedCount) * 10) / 10;
        studentCellsXml += `<Cell ss:StyleID="AverageCell"><Data ss:Type="String">${avg}%</Data></Cell>`;
      } else {
        studentCellsXml += `<Cell ss:StyleID="Center"><Data ss:Type="String">—</Data></Cell>`;
      }
    }

    if (filters.columns.homeworkApproval) {
      const studentHw = homework.filter((h) => h.studentId === student.id);
      if (studentHw.length > 0) {
        const approved = studentHw.filter((h) => h.approved).length;
        const rate = Math.round((approved / studentHw.length) * 100);
        studentCellsXml += `<Cell ss:StyleID="Center"><Data ss:Type="String">${rate}% (${approved}/${studentHw.length})</Data></Cell>`;
      } else {
        studentCellsXml += `<Cell ss:StyleID="Center"><Data ss:Type="String">—</Data></Cell>`;
      }
    }

    rowsXml += `<Row>${studentCellsXml}</Row>\n`;
  });

  // Build Summary Average Row
  let summaryCellsXml = `
    <Cell ss:StyleID="Summary"><Data ss:Type="String">Class Average</Data></Cell>
    <Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>
    <Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>
  `;

  filteredAssessments.forEach((assessment) => {
    const relevantGrades = filteredStudents
      .map((s) => gradeLookup.get(`${s.id}_${assessment.id}`))
      .filter((g): g is Grade => Boolean(g));

    if (relevantGrades.length > 0 && assessment.maxScore > 0) {
      const totalScore = relevantGrades.reduce((sum, g) => sum + g.score, 0);
      const avgScore = Math.round((totalScore / relevantGrades.length) * 10) / 10;
      const avgPct = calculatePercentage(avgScore, assessment.maxScore);

      let avgDisplay = "";
      if (filters.columns.score && filters.columns.percentage) {
        avgDisplay = `${avgScore} (${avgPct}%)`;
      } else if (filters.columns.score) {
        avgDisplay = `${avgScore}`;
      } else {
        avgDisplay = `${avgPct}%`;
      }

      summaryCellsXml += `<Cell ss:StyleID="Summary"><Data ss:Type="String">${escapeXml(avgDisplay)}</Data></Cell>`;
    } else {
      summaryCellsXml += `<Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>`;
    }
  });

  if (filters.columns.average) {
    summaryCellsXml += `<Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>`;
  }
  if (filters.columns.homeworkApproval) {
    summaryCellsXml += `<Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>`;
  }

  const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Academic Grades Matrix</Title>
  <Author>Teacher Assistant App</Author>
  <Created>${now.toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>
   <Interior/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4338CA"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderAverage">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E1B4B"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#3730A3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TextBold">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Center">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="AverageCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#4338CA"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Summary">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E1B4B"/>
   <Interior ss:Color="#E0E7FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Grades Matrix">
  <Table ss:DefaultRowHeight="22">
   <Column ss:Width="130"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="140"/>
   ${filteredAssessments.map(() => '<Column ss:Width="140"/>').join("\n   ")}
   ${filters.columns.average ? '<Column ss:Width="160"/>' : ""}
   ${filters.columns.homeworkApproval ? '<Column ss:Width="150"/>' : ""}
   <Row ss:Height="30">${headerCellsXml}</Row>
   ${rowsXml}
   <Row ss:Height="24">${summaryCellsXml}</Row>
  </Table>
 </Worksheet>
</Workbook>`;

  downloadFile(excelXml, filename, "application/vnd.ms-excel;charset=utf-8");
}

/**
 * Exports the filtered grades matrix as a clean UTF-8 CSV with BOM for universal spreadsheet compatibility.
 */
export function exportGradesToCsv({
  filteredStudents,
  filteredAssessments,
  homework,
  filters,
  classMap,
  gradeLookup,
}: ExportGradeMatrixParams) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const filename = `Grades-Matrix-Export-${dateStr}.csv`;

  const headers: string[] = [
    "Student Last Name",
    "Student First Name",
    "Preferred Name",
    "Class",
  ];

  filteredAssessments.forEach((assessment) => {
    const metaParts = [assessment.type.toUpperCase()];
    if (filters.columns.maxMark) metaParts.push(`Max: ${assessment.maxScore}`);
    if (filters.columns.date && assessment.assessmentDate) {
      metaParts.push(formatDate(assessment.assessmentDate));
    }
    headers.push(`${assessment.title} (${metaParts.join(" - ")})`);
  });

  if (filters.columns.average) headers.push("Student Overall Average (%)");
  if (filters.columns.homeworkApproval) headers.push("Homework Approval Rate");

  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(","));

  filteredStudents.forEach((student) => {
    let studentTotalPct = 0;
    let gradedCount = 0;

    const row: string[] = [
      student.lastName,
      student.firstName,
      student.preferredName || "",
      classMap.get(student.classId) || "Class",
    ];

    filteredAssessments.forEach((assessment) => {
      const grade = gradeLookup.get(`${student.id}_${assessment.id}`);
      if (grade && grade.score !== undefined) {
        const pct = calculatePercentage(grade.score, assessment.maxScore);
        studentTotalPct += pct;
        gradedCount++;

        let cellDisplay = "";
        if (filters.columns.score && filters.columns.percentage) {
          cellDisplay = `${grade.score}/${assessment.maxScore} (${pct}%)`;
        } else if (filters.columns.score) {
          cellDisplay = `${grade.score}/${assessment.maxScore}`;
        } else if (filters.columns.percentage) {
          cellDisplay = `${pct}%`;
        } else {
          cellDisplay = `${grade.score}`;
        }
        row.push(cellDisplay);
      } else {
        row.push("—");
      }
    });

    if (filters.columns.average) {
      if (gradedCount > 0) {
        const avg = Math.round((studentTotalPct / gradedCount) * 10) / 10;
        row.push(`${avg}%`);
      } else {
        row.push("—");
      }
    }

    if (filters.columns.homeworkApproval) {
      const studentHw = homework.filter((h) => h.studentId === student.id);
      if (studentHw.length > 0) {
        const approved = studentHw.filter((h) => h.approved).length;
        const rate = Math.round((approved / studentHw.length) * 100);
        row.push(`${rate}% (${approved}/${studentHw.length})`);
      } else {
        row.push("—");
      }
    }

    lines.push(row.map(escapeCsv).join(","));
  });

  // Summary Row
  const summaryRow: string[] = ["Class Average", "—", "—", "—"];
  filteredAssessments.forEach((assessment) => {
    const relevantGrades = filteredStudents
      .map((s) => gradeLookup.get(`${s.id}_${assessment.id}`))
      .filter((g): g is Grade => Boolean(g));

    if (relevantGrades.length > 0 && assessment.maxScore > 0) {
      const totalScore = relevantGrades.reduce((sum, g) => sum + g.score, 0);
      const avgScore = Math.round((totalScore / relevantGrades.length) * 10) / 10;
      const avgPct = calculatePercentage(avgScore, assessment.maxScore);

      let avgDisplay = "";
      if (filters.columns.score && filters.columns.percentage) {
        avgDisplay = `${avgScore} (${avgPct}%)`;
      } else if (filters.columns.score) {
        avgDisplay = `${avgScore}`;
      } else {
        avgDisplay = `${avgPct}%`;
      }
      summaryRow.push(avgDisplay);
    } else {
      summaryRow.push("—");
    }
  });

  if (filters.columns.average) summaryRow.push("—");
  if (filters.columns.homeworkApproval) summaryRow.push("—");

  lines.push(summaryRow.map(escapeCsv).join(","));

  // UTF-8 BOM \uFEFF ensures Excel displays Arabic and international characters correctly
  const csvContent = "\uFEFF" + lines.join("\r\n");
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

export interface ExportAssessmentSheetParams {
  assessment: Assessment;
  className: string;
  students: Student[];
  gradeInputs: Record<number, { score: string; feedback: string }>;
}

/**
 * Export single assessment mark sheet as Excel XML
 */
export function exportAssessmentSheetToExcelXml({
  assessment,
  className,
  students,
  gradeInputs,
}: ExportAssessmentSheetParams) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const cleanTitle = assessment.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `MarkSheet-${cleanTitle}-${dateStr}.xls`;

  let totalScore = 0;
  let enteredCount = 0;

  let rowsXml = "";
  students.forEach((student) => {
    const input = gradeInputs[student.id!] || { score: "", feedback: "" };
    const numScore = parseFloat(input.score);
    const hasScore = !isNaN(numScore);

    let pctDisplay = "—";
    let scoreDisplay = "—";

    if (hasScore) {
      totalScore += numScore;
      enteredCount++;
      const pct = calculatePercentage(numScore, assessment.maxScore);
      scoreDisplay = `${numScore}/${assessment.maxScore}`;
      pctDisplay = `${pct}%`;
    }

    rowsXml += `
      <Row>
        <Cell ss:StyleID="TextBold"><Data ss:Type="String">${escapeXml(student.lastName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(student.firstName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(student.preferredName || "")}</Data></Cell>
        <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(scoreDisplay)}</Data></Cell>
        <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(pctDisplay)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(input.feedback || "")}</Data></Cell>
      </Row>
    `;
  });

  const avgScore = enteredCount > 0 ? Math.round((totalScore / enteredCount) * 10) / 10 : 0;
  const avgPct = enteredCount > 0 ? calculatePercentage(avgScore, assessment.maxScore) : 0;

  const summaryXml = `
    <Row ss:Height="24">
      <Cell ss:StyleID="Summary"><Data ss:Type="String">Assessment Average</Data></Cell>
      <Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>
      <Cell ss:StyleID="Summary"><Data ss:Type="String">—</Data></Cell>
      <Cell ss:StyleID="Summary"><Data ss:Type="String">${enteredCount > 0 ? `${avgScore}/${assessment.maxScore}` : "—"}</Data></Cell>
      <Cell ss:StyleID="Summary"><Data ss:Type="String">${enteredCount > 0 ? `${avgPct}%` : "—"}</Data></Cell>
      <Cell ss:StyleID="Summary"><Data ss:Type="String">Marked ${enteredCount}/${students.length} students</Data></Cell>
    </Row>
  `;

  const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${escapeXml(assessment.title)} (${escapeXml(className)}) Mark Sheet</Title>
  <Author>Teacher Assistant App</Author>
  <Created>${now.toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>
   <Interior/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4338CA"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TextBold">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Center">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Summary">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E1B4B"/>
   <Interior ss:Color="#E0E7FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(assessment.title.slice(0, 30))}">
  <Table ss:DefaultRowHeight="22">
   <Column ss:Width="130"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="90"/>
   <Column ss:Width="250"/>
   <Row ss:Height="30">
     <Cell ss:StyleID="Header"><Data ss:Type="String">Student Last Name</Data></Cell>
     <Cell ss:StyleID="Header"><Data ss:Type="String">Student First Name</Data></Cell>
     <Cell ss:StyleID="Header"><Data ss:Type="String">Preferred Name</Data></Cell>
     <Cell ss:StyleID="Header"><Data ss:Type="String">Score (Max: ${assessment.maxScore})</Data></Cell>
     <Cell ss:StyleID="Header"><Data ss:Type="String">Percentage (%)</Data></Cell>
     <Cell ss:StyleID="Header"><Data ss:Type="String">Teacher Feedback</Data></Cell>
   </Row>
   ${rowsXml}
   ${summaryXml}
  </Table>
 </Worksheet>
</Workbook>`;

  downloadFile(excelXml, filename, "application/vnd.ms-excel;charset=utf-8");
}

/**
 * Export single assessment mark sheet as CSV
 */
export function exportAssessmentSheetToCsv({
  assessment,
  className,
  students,
  gradeInputs,
}: ExportAssessmentSheetParams) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const cleanTitle = assessment.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `MarkSheet-${cleanTitle}-${dateStr}.csv`;

  const headers = [
    "Student Last Name",
    "Student First Name",
    "Preferred Name",
    "Class",
    `Score (Max: ${assessment.maxScore})`,
    "Percentage (%)",
    "Teacher Feedback",
  ];

  const lines: string[] = [headers.map(escapeCsv).join(",")];
  let totalScore = 0;
  let enteredCount = 0;

  students.forEach((student) => {
    const input = gradeInputs[student.id!] || { score: "", feedback: "" };
    const numScore = parseFloat(input.score);
    const hasScore = !isNaN(numScore);

    let scoreDisplay = "—";
    let pctDisplay = "—";

    if (hasScore) {
      totalScore += numScore;
      enteredCount++;
      const pct = calculatePercentage(numScore, assessment.maxScore);
      scoreDisplay = `${numScore}/${assessment.maxScore}`;
      pctDisplay = `${pct}%`;
    }

    const row = [
      student.lastName,
      student.firstName,
      student.preferredName || "",
      className,
      scoreDisplay,
      pctDisplay,
      input.feedback || "",
    ];
    lines.push(row.map(escapeCsv).join(","));
  });

  const avgScore = enteredCount > 0 ? Math.round((totalScore / enteredCount) * 10) / 10 : 0;
  const avgPct = enteredCount > 0 ? calculatePercentage(avgScore, assessment.maxScore) : 0;

  const summaryRow = [
    "Assessment Average",
    "—",
    "—",
    className,
    enteredCount > 0 ? `${avgScore}/${assessment.maxScore}` : "—",
    enteredCount > 0 ? `${avgPct}%` : "—",
    `Marked ${enteredCount}/${students.length} students`,
  ];
  lines.push(summaryRow.map(escapeCsv).join(","));

  const csvContent = "\uFEFF" + lines.join("\r\n");
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}
