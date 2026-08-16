import { downloadWorkbook, headerRow } from "./download";
import type { WorkLog } from "@/types/database";

type Row = WorkLog & {
  machines: { machine_name: string; machine_type: string; category: string } | null;
  staff: { name: string } | null;
  projects: { project_name: string; work_type: string } | null;
};

export async function buildMachineReport(rows: Row[], subdivisionName: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Machine Report");

  sheet.columns = [
    { header: "Date", key: "date" },
    { header: "Machine Type", key: "machineType" },
    { header: "Machine", key: "machine" },
    { header: "Category", key: "category" },
    { header: "Operator/Driver", key: "staff" },
    { header: "Project", key: "project" },
    { header: "Start Reading", key: "start" },
    { header: "End Reading", key: "end" },
    { header: "Total Hours/KM", key: "total" },
    { header: "Diesel (L)", key: "diesel" },
    { header: "Shift Hours", key: "shiftHours" },
    { header: "Remark", key: "remark" },
  ];

  rows.forEach((r) => {
    sheet.addRow({
      date: r.work_date,
      machineType: r.machines?.machine_type ?? "",
      machine: r.machines?.machine_name ?? "",
      category: r.machines?.category ?? "",
      staff: r.staff?.name ?? "",
      project: r.projects?.project_name ?? "",
      start: r.start_reading,
      end: r.end_reading,
      total: r.total_reading,
      diesel: r.diesel_qty,
      shiftHours: r.total_shift_hours ?? "",
      remark: r.remark ?? "",
    });
  });

  headerRow(sheet);

  await downloadWorkbook(workbook, `Machine_Report_${subdivisionName}.xlsx`);
}
