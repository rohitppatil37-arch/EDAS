import { downloadWorkbook } from "./download";
import {
  alignColumn,
  alignRange,
  freezeRows,
  setColumnWidths,
  styleBorders,
  styleSubHeaderRows,
  styleTableHeader,
  styleTitleRow,
  styleZebra,
} from "./legacyStyle";
import type { Machine, WorkLog } from "@/types/database";

type Row = WorkLog & {
  machines: { machine_name: string; machine_type: string; category: string } | null;
  staff: { name: string } | null;
  projects: { project_name: string; work_type: string } | null;
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function fmtDayMonth(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}-${m}`;
}

function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    dates.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

export async function buildAttendanceReport(rows: Row[], machines: Machine[], subdivisionName: string, from: string, to: string) {
  if (rows.length === 0) {
    throw new Error("No attendance data found");
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sh = workbook.addWorksheet("Attendance");

  const days = eachDate(from, to);
  const totalCols = days.length + 4;

  const machineMap = new Map<string, { drivers: string[]; dates: Set<string> }>();
  rows.forEach((r) => {
    const entry = machineMap.get(r.machine_id) ?? { drivers: [], dates: new Set<string>() };
    const driver = r.staff?.name;
    if (driver && !entry.drivers.includes(driver)) entry.drivers.push(driver);
    entry.dates.add(r.work_date);
    machineMap.set(r.machine_id, entry);
  });

  function fillRow(arr: (string | number)[]) {
    while (arr.length < totalCols) arr.push("");
    return arr;
  }

  sh.addRow(fillRow(["Driver / Operator Attendance Register"]));
  sh.addRow(fillRow([`Mechanical Sub-Division : ${subdivisionName}`]));
  sh.addRow(fillRow([`Period : ${fmtDate(from)} ते ${fmtDate(to)}`]));
  sh.addRow(fillRow([]));

  const header = ["SR No.", "Driver / Operator Name", "Machine", ...days.map(fmtDayMonth), "Total P"];
  sh.addRow(fillRow(header));

  const sortedMachines = [...machines].sort((a, b) => a.machine_name.localeCompare(b.machine_name));

  sortedMachines.forEach((machine, i) => {
    const entry = machineMap.get(machine.id);
    const drivers = entry && entry.drivers.length > 0 ? entry.drivers.join(" / ") : "-";

    const row: (string | number)[] = [i + 1, drivers, machine.machine_name];
    let pCount = 0;
    days.forEach((day) => {
      const status = entry?.dates.has(day) ? "P" : "A";
      row.push(status);
      if (status === "P") pCount++;
    });
    row.push(pCount);

    sh.addRow(fillRow(row));
  });

  const lastRow = sh.rowCount;

  styleTitleRow(sh, 1, totalCols, 14);
  styleSubHeaderRows(sh, 2, 3, totalCols);
  styleTableHeader(sh, 5, totalCols);
  styleBorders(sh, 5, lastRow, totalCols);
  alignRange(sh, 6, lastRow, totalCols, "center");
  alignColumn(sh, 2, 6, lastRow, "left");
  alignColumn(sh, 3, 6, lastRow, "left");
  styleZebra(sh, 6, lastRow, totalCols);

  const widths = [80, 220, 300, ...Array(totalCols - 3).fill(80)];
  setColumnWidths(sh, widths);
  freezeRows(sh, 5);

  await downloadWorkbook(workbook, `Attendance_Report_${subdivisionName}.xlsx`);
}
