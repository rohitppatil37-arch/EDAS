import { downloadWorkbook } from "./download";
import {
  alignColumn,
  alignRange,
  COLORS,
  freezeRows,
  setColumnWidths,
  styleBorders,
  styleSubHeaderRows,
  styleTitleRow,
  styleTotalRow,
  styleZebra,
} from "./legacyStyle";
import type { WorkLog } from "@/types/database";

type Row = WorkLog & {
  machines: { machine_name: string; machine_type: string; category: string; capacity: number | null; rate: number | null } | null;
  projects: { project_name: string } | null;
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface MachineBucket {
  category: string;
  capacity: number;
  rate: number;
  beforeReading: number;
  beforeTrips: number;
  duringReading: number;
  duringTrips: number;
}

function volumeOf(category: string, reading: number, trips: number, capacity: number) {
  return (category === "Vehicle" ? trips : reading) * capacity;
}

function fillHeaderCell(sh: import("exceljs").Worksheet, row: number, col: number) {
  const cell = sh.getCell(row, col);
  cell.font = { bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.tableHeader } };
}

export async function buildProgressReport(
  rows: Row[],
  subdivisionName: string,
  seasonStart: string,
  from: string,
  to: string
) {
  if (rows.length === 0) {
    throw new Error("No data found in selected period");
  }

  // project_id -> { name, startDate, machines: machine_id -> bucket }
  const projects = new Map<
    string,
    { name: string; startDate: string; machines: Map<string, MachineBucket> }
  >();
  const activeProjectIds = new Set<string>();

  rows.forEach((r) => {
    if (!r.project_id || !r.projects || !r.machines) return;
    if (r.work_date >= from && r.work_date <= to) activeProjectIds.add(r.project_id);

    if (!projects.has(r.project_id)) {
      projects.set(r.project_id, { name: r.projects.project_name, startDate: r.work_date, machines: new Map() });
    }
    const proj = projects.get(r.project_id)!;
    if (r.work_date < proj.startDate) proj.startDate = r.work_date;

    if (r.work_date < seasonStart) return; // outside this season's cumulative window

    if (!proj.machines.has(r.machine_id)) {
      proj.machines.set(r.machine_id, {
        category: r.machines.category,
        capacity: r.machines.capacity ?? 0,
        rate: r.machines.rate ?? 0,
        beforeReading: 0,
        beforeTrips: 0,
        duringReading: 0,
        duringTrips: 0,
      });
    }
    const bucket = proj.machines.get(r.machine_id)!;
    const reading = Number(r.total_reading || 0);
    const trips = Number(r.trip_count || 0);
    if (r.work_date < from) {
      bucket.beforeReading += reading;
      bucket.beforeTrips += trips;
    } else if (r.work_date <= to) {
      bucket.duringReading += reading;
      bucket.duringTrips += trips;
    }
  });

  const machineNameById = new Map<string, string>();
  rows.forEach((r) => {
    if (r.machines) machineNameById.set(r.machine_id, r.machines.machine_name);
  });

  const activeProjects = [...projects.entries()]
    .filter(([id]) => activeProjectIds.has(id))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  if (activeProjects.length === 0) {
    throw new Error("No project activity found in selected period");
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sh = workbook.addWorksheet("प्रगती अहवाल");

  const colCount = 19;
  const blank = () => Array(colCount).fill("");

  sh.addRow([`प्रगती अहवाल — हंगाम सुरुवात: ${fmtDate(seasonStart)} | कालावधी: ${fmtDate(from)} ते ${fmtDate(to)}`, ...blank().slice(1)]);
  sh.addRow([`यंत्रिकी उपविभाग : ${subdivisionName}`, ...blank().slice(1)]);

  const HEADER_ROW = 3;
  const SUBHEADER_ROW = 4;
  sh.addRow(blank());
  sh.addRow(blank());

  const singleHeaders: [number, string][] = [
    [1, "अ.क्र."],
    [2, "प्रकल्पाचे नाव"],
    [3, "काम सुरु दिनांक"],
    [4, "सयंत्राचे नाव"],
    [17, "रक्कम (रु.)"],
    [18, "यंत्र दर (रु.)"],
    [19, "शेरा"],
  ];
  singleHeaders.forEach(([col, label]) => {
    sh.mergeCells(HEADER_ROW, col, SUBHEADER_ROW, col);
    sh.getCell(HEADER_ROW, col).value = label;
    fillHeaderCell(sh, HEADER_ROW, col);
    fillHeaderCell(sh, SUBHEADER_ROW, col);
  });

  const groups: [number, string][] = [
    [5, "मागील प्रगती (हंगाम ते चालू कालावधीपूर्वी)"],
    [9, "चालू कालावधीतील प्रगती"],
    [13, "हंगाम सुरुवातीपासून चालू कालावधीअखेर एकूण प्रगती"],
  ];
  const subLabels = ["तास/किमी", "मातीकाम (घ.मी.)", "खडक खोदाई (घ.मी.)", "एकूण (घ.मी.)"];
  groups.forEach(([startCol, label]) => {
    sh.mergeCells(HEADER_ROW, startCol, HEADER_ROW, startCol + 3);
    sh.getCell(HEADER_ROW, startCol).value = label;
    fillHeaderCell(sh, HEADER_ROW, startCol);
    subLabels.forEach((sub, i) => {
      sh.getCell(SUBHEADER_ROW, startCol + i).value = sub;
      fillHeaderCell(sh, SUBHEADER_ROW, startCol + i);
    });
  });

  const subtotalRows: number[] = [];
  let sr = 1;
  let grandBeforeReading = 0,
    grandBeforeVol = 0,
    grandDuringReading = 0,
    grandDuringVol = 0,
    grandCumReading = 0,
    grandCumVol = 0,
    grandAmount = 0;

  activeProjects.forEach(([, proj]) => {
    const machineEntries = [...proj.machines.entries()].sort((a, b) =>
      (machineNameById.get(a[0]) ?? "").localeCompare(machineNameById.get(b[0]) ?? "")
    );

    let pBeforeReading = 0,
      pBeforeVol = 0,
      pDuringReading = 0,
      pDuringVol = 0,
      pCumReading = 0,
      pCumVol = 0,
      pAmount = 0;
    const projectFirstRow = sh.rowCount + 1;

    machineEntries.forEach(([machineId, b]) => {
      const beforeVol = round2(volumeOf(b.category, b.beforeReading, b.beforeTrips, b.capacity));
      const duringVol = round2(volumeOf(b.category, b.duringReading, b.duringTrips, b.capacity));
      const cumReading = round2(b.beforeReading + b.duringReading);
      const cumVol = round2(beforeVol + duringVol);
      const amount = round2(cumReading * b.rate);

      pBeforeReading += b.beforeReading;
      pBeforeVol += beforeVol;
      pDuringReading += b.duringReading;
      pDuringVol += duringVol;
      pCumReading += cumReading;
      pCumVol += cumVol;
      pAmount += amount;

      sh.addRow([
        sr,
        proj.name,
        proj.startDate ? fmtDate(proj.startDate) : "",
        machineNameById.get(machineId) ?? "",
        round2(b.beforeReading),
        beforeVol,
        0,
        beforeVol,
        round2(b.duringReading),
        duringVol,
        0,
        duringVol,
        cumReading,
        cumVol,
        0,
        cumVol,
        amount,
        b.rate,
        "",
      ]);
    });

    const projectLastRow = sh.rowCount;
    sh.addRow([
      "",
      `एकूण - ${proj.name}`,
      "",
      "",
      round2(pBeforeReading),
      round2(pBeforeVol),
      0,
      round2(pBeforeVol),
      round2(pDuringReading),
      round2(pDuringVol),
      0,
      round2(pDuringVol),
      round2(pCumReading),
      round2(pCumVol),
      0,
      round2(pCumVol),
      round2(pAmount),
      "",
      "",
    ]);
    subtotalRows.push(sh.rowCount);

    if (projectLastRow >= projectFirstRow) {
      sh.mergeCells(projectFirstRow, 2, projectLastRow, 2);
      sh.mergeCells(projectFirstRow, 3, projectLastRow, 3);
      sh.mergeCells(projectFirstRow, 1, projectLastRow, 1);
    }

    grandBeforeReading += pBeforeReading;
    grandBeforeVol += pBeforeVol;
    grandDuringReading += pDuringReading;
    grandDuringVol += pDuringVol;
    grandCumReading += pCumReading;
    grandCumVol += pCumVol;
    grandAmount += pAmount;
    sr++;
  });

  sh.addRow([
    "",
    "एकूण (सर्व प्रकल्प)",
    "",
    "",
    round2(grandBeforeReading),
    round2(grandBeforeVol),
    0,
    round2(grandBeforeVol),
    round2(grandDuringReading),
    round2(grandDuringVol),
    0,
    round2(grandDuringVol),
    round2(grandCumReading),
    round2(grandCumVol),
    0,
    round2(grandCumVol),
    round2(grandAmount),
    "",
    "",
  ]);

  const lastRow = sh.rowCount;

  styleTitleRow(sh, 1, colCount);
  styleSubHeaderRows(sh, 2, 2, colCount);
  styleBorders(sh, HEADER_ROW, lastRow, colCount);
  alignRange(sh, SUBHEADER_ROW + 1, lastRow, colCount, "center");
  alignColumn(sh, 2, SUBHEADER_ROW + 1, lastRow, "left");
  alignColumn(sh, 4, SUBHEADER_ROW + 1, lastRow, "left");
  styleZebra(sh, SUBHEADER_ROW + 1, lastRow, colCount);
  subtotalRows.forEach((r) => styleTotalRow(sh, r, colCount, COLORS.totalAlt));
  styleTotalRow(sh, lastRow, colCount);
  setColumnWidths(sh, [55, 260, 100, 260, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 110, 90, 140]);
  freezeRows(sh, SUBHEADER_ROW);

  await downloadWorkbook(workbook, `Progress_Report_${subdivisionName}.xlsx`);
}
