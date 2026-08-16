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

export async function buildGpsReport(
  rows: Row[],
  machines: Machine[],
  gpsDiffMap: Map<string, number>,
  subdivisionName: string,
  from: string,
  to: string
) {
  if (rows.length === 0) {
    throw new Error("No GPS data found in selected range");
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  const period = `${fmtDate(from)} ते ${fmtDate(to)}`;
  const sortedMachines = [...machines].sort((a, b) => a.machine_name.localeCompare(b.machine_name));
  const sheetNameFor = createSheetNamer();

  sortedMachines.forEach((machine) => {
    const sh = workbook.addWorksheet(sheetNameFor(machine.machine_name));

    sh.addRow(["मा. कार्यकारी अभियंता यांत्रिकी विभाग (को.प्र), अलोरे", "", "", "", "", ""]);
    sh.addRow([`यंत्रिकी उपविभाग : ${subdivisionName}`, "", "", "", "", ""]);
    sh.addRow([`Machine / Vehicle : ${machine.machine_name}`, "", "", "", "", ""]);
    sh.addRow([`रिपोर्ट कालावधी : ${period}`, "", "", "", "", ""]);
    sh.addRow([
      "दिनांक",
      "सुरुवातीचे reading",
      "शेवटचे reading",
      "Dashboard एकूण (तास/km)",
      "GPS (तास/किमी)",
      "प्रकल्प",
    ]);

    let totalDash = 0;
    let totalGps = 0;

    rows
      .filter((r) => r.machine_id === machine.id)
      .forEach((r) => {
        const dash = Number(r.total_reading || 0);
        const gps = gpsDiffMap.get(`${machine.id}|${r.work_date}`) ?? 0;
        totalDash += dash;
        totalGps += gps;

        sh.addRow([
          fmtDate(r.work_date),
          r.start_reading,
          r.end_reading,
          dash,
          gpsDiffMap.get(`${machine.id}|${r.work_date}`) ?? "",
          r.projects?.project_name ?? "",
        ]);
      });

    sh.addRow(["", "", "", "", "", ""]);
    sh.addRow(["Total", "", "", totalDash, totalGps, ""]);

    const lastRow = sh.rowCount;

    styleTitleRow(sh, 1, 6);
    styleSubHeaderRows(sh, 2, 4, 6);
    styleTableHeader(sh, 5, 6);
    styleBorders(sh, 5, lastRow, 6);
    alignRange(sh, 6, lastRow, 6, "center");
    alignColumn(sh, 6, 6, lastRow, "left");
    styleZebra(sh, 6, lastRow, 6);
    styleTotalRow(sh, lastRow, 6);
    setColumnWidths(sh, [120, 140, 140, 200, 160, 300]);
    freezeRows(sh, 5);
  });

  await downloadWorkbook(workbook, `GPS_Report_${subdivisionName}.xlsx`);
}
