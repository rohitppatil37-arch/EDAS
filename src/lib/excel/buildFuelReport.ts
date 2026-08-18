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
  styleTotalRow,
  styleZebra,
} from "./legacyStyle";
import type { Machine, WorkLog } from "@/types/database";

type Row = WorkLog & {
  machines: { machine_name: string; machine_type: string; category: string } | null;
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function buildFuelReport(
  rows: Row[],
  machines: Machine[],
  subdivisionName: string,
  from: string,
  to: string
) {
  const totals = new Map<string, { diesel: number; reading: number }>();
  rows.forEach((r) => {
    const t = totals.get(r.machine_id) ?? { diesel: 0, reading: 0 };
    t.diesel += Number(r.diesel_qty || 0);
    t.reading += Number(r.total_reading || 0);
    totals.set(r.machine_id, t);
  });

  const sortedMachines = [...machines].sort((a, b) => a.machine_name.localeCompare(b.machine_name));

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sh = workbook.addWorksheet("इंधन वापर अहवाल");

  const colCount = 9;
  const blank = () => Array(colCount).fill("");

  sh.addRow([`इंधन वापर अहवाल — कालावधी: ${fmtDate(from)} ते ${fmtDate(to)}`, ...blank().slice(1)]);
  sh.addRow([`यंत्रिकी उपविभाग : ${subdivisionName}`, ...blank().slice(1)]);
  sh.addRow([
    "अ.क्र.",
    "सयंत्राचे नाव व क्रमांक",
    "डिझेल भरले",
    "एकूण डिझेल",
    "प्रत्यक्ष वापर",
    "तास",
    "किमी",
    "सरासरी",
    "शेरा",
  ]);

  let sr = 1;
  let grandDiesel = 0;

  sortedMachines.forEach((m) => {
    const t = totals.get(m.id) ?? { diesel: 0, reading: 0 };
    const diesel = round2(t.diesel);
    const hours = m.category === "Machine" ? round2(t.reading) : 0;
    const km = m.category === "Vehicle" ? round2(t.reading) : 0;
    const average =
      m.category === "Vehicle" ? (diesel > 0 ? round2(km / diesel) : 0) : hours > 0 ? round2(diesel / hours) : 0;
    const totalDiesel = diesel;
    const actualConsumption = diesel;

    grandDiesel += diesel;

    sh.addRow([sr++, m.machine_name, diesel, totalDiesel, actualConsumption, hours, km, average, ""]);
  });

  sh.addRow([
    "एकूण",
    "",
    Number(grandDiesel.toFixed(2)),
    Number(grandDiesel.toFixed(2)),
    Number(grandDiesel.toFixed(2)),
    "",
    "",
    "",
    "",
  ]);

  const lastRow = sh.rowCount;

  styleTitleRow(sh, 1, colCount);
  styleSubHeaderRows(sh, 2, 2, colCount);
  styleTableHeader(sh, 3, colCount);
  styleBorders(sh, 3, lastRow, colCount);
  alignRange(sh, 4, lastRow, colCount, "center");
  alignColumn(sh, 2, 4, lastRow, "left");
  styleZebra(sh, 4, lastRow, colCount);
  styleTotalRow(sh, lastRow, colCount);
  setColumnWidths(sh, [70, 260, 120, 120, 130, 90, 90, 100, 160]);
  freezeRows(sh, 3);

  await downloadWorkbook(workbook, `Fuel_Consumption_Report_${subdivisionName}.xlsx`);
}
