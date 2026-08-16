import { downloadWorkbook } from "./download";
import {
  alignColumn,
  alignRange,
  createSheetNamer,
  freezeRows,
  setColumnWidths,
  styleBorders,
  styleSubHeaderRows,
  styleTableHeader,
  styleTitleRow,
  styleTotalRow,
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

export async function buildMachineReport(
  rows: Row[],
  machines: Machine[],
  gpsDiffMap: Map<string, number>,
  subdivisionName: string,
  from: string,
  to: string
) {
  if (rows.length === 0) {
    throw new Error("No data found in selected range");
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  const period = `${fmtDate(from)} ते ${fmtDate(to)}`;
  const summaryData: { machine: string; dash: number; diesel: number }[] = [];
  let grandDash = 0;
  let grandDiesel = 0;

  const sortedMachines = [...machines].sort((a, b) => a.machine_name.localeCompare(b.machine_name));
  const sheetNameFor = createSheetNamer();

  sortedMachines.forEach((machine) => {
    const sh = workbook.addWorksheet(sheetNameFor(machine.machine_name));

    sh.addRow(["मा. कार्यकारी अभियंता यांत्रिकी विभाग (को.प्र), अलोरे", "", "", "", "", "", ""]);
    sh.addRow([`यंत्रिकी उपविभाग : ${subdivisionName}`, "", "", "", "", "", ""]);
    sh.addRow([`Machine / Vehicle : ${machine.machine_name}`, "", "", "", "", "", ""]);
    sh.addRow([`रिपोर्ट कालावधी : ${period}`, "", "", "", "", "", ""]);
    sh.addRow([
      "दिनांक",
      "सुरुवातीचे reading",
      "शेवटचे reading",
      "Dashboard एकूण (तास/km)",
      "प्रकल्प",
      "डिझेल",
      "GPS",
    ]);

    let totalDash = 0;
    let totalDiesel = 0;

    rows
      .filter((r) => r.machine_id === machine.id)
      .forEach((r) => {
        const dash = Number(r.total_reading || 0);
        const diesel = Number(r.diesel_qty || 0);
        totalDash += dash;
        totalDiesel += diesel;

        sh.addRow([
          fmtDate(r.work_date),
          r.start_reading,
          r.end_reading,
          dash,
          r.projects?.project_name ?? "",
          diesel,
          gpsDiffMap.get(`${machine.id}|${r.work_date}`) ?? "",
        ]);
      });

    sh.addRow(["", "", "", "", "", "", ""]);
    sh.addRow(["Total", "", "", totalDash, "", totalDiesel, ""]);

    const lastRow = sh.rowCount;

    styleTitleRow(sh, 1, 7);
    styleSubHeaderRows(sh, 2, 4, 7);
    styleTableHeader(sh, 5, 7);
    styleBorders(sh, 5, lastRow, 7);
    alignRange(sh, 6, lastRow, 7, "center");
    alignColumn(sh, 5, 6, lastRow, "left");
    styleZebra(sh, 6, lastRow, 7);
    styleTotalRow(sh, lastRow, 7);
    setColumnWidths(sh, [120, 140, 140, 200, 320, 120, 120]);
    freezeRows(sh, 5);

    summaryData.push({ machine: machine.machine_name, dash: totalDash, diesel: totalDiesel });
    grandDash += totalDash;
    grandDiesel += totalDiesel;
  });

  const sum = workbook.addWorksheet("Summary");
  sum.addRow(["Machine", "Total Hours/KM", "Diesel"]);
  summaryData.forEach((s) => sum.addRow([s.machine, s.dash, s.diesel]));
  sum.addRow(["", "", ""]);
  sum.addRow(["Grand Total", grandDash, grandDiesel]);

  styleTableHeader(sum, 1, 3);
  const sumLastRow = sum.rowCount;
  sum.getCell(sumLastRow, 1).font = { bold: true };
  sum.getCell(sumLastRow, 2).font = { bold: true };
  sum.getCell(sumLastRow, 3).font = { bold: true };
  setColumnWidths(sum, [180, 140, 140]);
  styleBorders(sum, 1, sumLastRow, 3);
  styleZebra(sum, 2, sumLastRow, 3);

  await downloadWorkbook(workbook, `Machine_Report_${subdivisionName}.xlsx`);
}
