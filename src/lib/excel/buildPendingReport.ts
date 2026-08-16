import { downloadWorkbook } from "./download";
import {
  alignColumn,
  alignRange,
  COLORS,
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

function toUtcDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function getWeekIndex(date: Date, from: Date): number {
  const firstSunday = new Date(from);
  while (firstSunday.getUTCDay() !== 0) {
    firstSunday.setUTCDate(firstSunday.getUTCDate() + 1);
  }
  if (date <= firstSunday) return 0;
  const diff = date.getTime() - firstSunday.getTime();
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(4, week);
}

export async function buildPendingReport(rows: Row[], machines: Machine[], subdivisionName: string, from: string, to: string) {
  if (rows.length === 0) {
    throw new Error("No data found in selected period");
  }

  const machineNames = [...machines].sort((a, b) => a.machine_name.localeCompare(b.machine_name)).map((m) => m.machine_name);
  const rateMap = new Map(machines.map((m) => [m.machine_name, Number(m.rate || 0)]));

  const fromDate = toUtcDate(from);
  const projectMap = new Map<string, Map<string, number[]>>();

  rows.forEach((r) => {
    const project = r.projects?.project_name ?? "Other Projects";
    const machine = r.machines?.machine_name;
    const hrs = Number(r.total_reading || 0);
    if (!machine || hrs <= 0) return;

    if (!projectMap.has(project)) projectMap.set(project, new Map());
    const machineWeeks = projectMap.get(project)!;
    if (!machineWeeks.has(machine)) machineWeeks.set(machine, [0, 0, 0, 0, 0]);

    const week = getWeekIndex(toUtcDate(r.work_date), fromDate);
    machineWeeks.get(machine)![week] += hrs;
  });

  if (projectMap.size === 0) {
    throw new Error("No machine hours found in selected date range");
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sh = workbook.addWorksheet("Pending Amount");

  const blank11 = () => Array(11).fill("");

  sh.addRow(["मा. कार्यकारी अभियंता यांत्रिकी विभाग (को.प्र), अलोरे", ...blank11().slice(1)]);
  sh.addRow([`यंत्रिकी उपविभाग : ${subdivisionName}`, ...blank11().slice(1)]);
  sh.addRow([`रिपोर्ट कालावधी : ${fmtDate(from)} ते ${fmtDate(to)}`, ...blank11().slice(1)]);
  sh.addRow(blank11());
  sh.addRow(["Sr", "Project Name", "Machine / Vehicle", "W1", "W2", "W3", "W4", "W5", "Total Hrs/Km", "Rate", "Amount"]);

  let sr = 1;
  let grandTotal = 0;

  [...projectMap.keys()].sort().forEach((project) => {
    let subTotal = 0;
    const machineWeeks = projectMap.get(project)!;

    machineNames.forEach((machine) => {
      const w = machineWeeks.get(machine);
      if (!w) return;

      const total = w.reduce((a, b) => a + b, 0);
      const rate = rateMap.get(machine) ?? 0;
      const amt = total * rate;

      subTotal += amt;
      grandTotal += amt;

      sh.addRow([
        sr++,
        project,
        machine,
        Number(w[0].toFixed(2)),
        Number(w[1].toFixed(2)),
        Number(w[2].toFixed(2)),
        Number(w[3].toFixed(2)),
        Number(w[4].toFixed(2)),
        Number(total.toFixed(2)),
        rate,
        Number(amt.toFixed(2)),
      ]);
    });

    sh.addRow(["", `SUB TOTAL - ${project}`, "", "", "", "", "", "", "", "", Number(subTotal.toFixed(2))]);
  });

  sh.addRow(["", "", "", "", "", "", "", "", "", "GRAND TOTAL", Number(grandTotal.toFixed(2))]);

  const lastRow = sh.rowCount;

  styleTitleRow(sh, 1, 11);
  styleSubHeaderRows(sh, 2, 3, 11);
  styleTableHeader(sh, 5, 11);
  styleBorders(sh, 5, lastRow, 11);
  setColumnWidths(sh, [70, 260, 320, 110, 110, 110, 110, 110, 110, 110, 110]);
  alignRange(sh, 6, lastRow, 11, "center");
  alignColumn(sh, 2, 6, lastRow, "left");
  alignColumn(sh, 3, 6, lastRow, "left");

  // Legacy sets a highlighted total style on the grand-total row's last two
  // columns *before* the zebra pass, so an even-indexed grand-total row gets
  // its background overwritten by the zebra stripe — replicated as-is.
  sh.getCell(lastRow, 10).font = { bold: true };
  sh.getCell(lastRow, 11).font = { bold: true };
  sh.getCell(lastRow, 10).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.totalAlt } };
  sh.getCell(lastRow, 11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.totalAlt } };

  styleZebra(sh, 6, lastRow, 11);
  freezeRows(sh, 5);

  await downloadWorkbook(workbook, `Pending_Amount_Report_${subdivisionName}.xlsx`);
}
