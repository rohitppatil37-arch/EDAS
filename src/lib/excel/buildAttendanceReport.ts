import { downloadWorkbook, headerRow } from "./download";
import type { Attendance } from "@/types/database";

type Row = Attendance & { staff: { name: string; role: string } | null };

export async function buildAttendanceReport(rows: Row[], subdivisionName: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance Report");

  sheet.columns = [
    { header: "Date", key: "date" },
    { header: "Name", key: "name" },
    { header: "Role", key: "role" },
    { header: "Status", key: "status" },
    { header: "Source", key: "source" },
    { header: "Remarks", key: "remarks" },
  ];

  rows.forEach((r) => {
    sheet.addRow({
      date: r.attendance_date,
      name: r.staff?.name ?? "",
      role: r.staff?.role ?? "",
      status: r.status,
      source: r.source === "auto" ? "Auto (Form)" : "Manual",
      remarks: r.remarks ?? "",
    });
  });

  headerRow(sheet);

  await downloadWorkbook(workbook, `Attendance_Report_${subdivisionName}.xlsx`);
}
