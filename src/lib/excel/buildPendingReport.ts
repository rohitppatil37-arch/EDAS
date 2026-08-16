import { downloadWorkbook, headerRow } from "./download";
import type { PendingPayment } from "@/types/database";

export async function buildPendingReport(rows: PendingPayment[], subdivisionName: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pending Payments");

  sheet.columns = [
    { header: "Category", key: "category" },
    { header: "Party", key: "party" },
    { header: "Amount", key: "amount" },
    { header: "Due Date", key: "dueDate" },
    { header: "Status", key: "status" },
    { header: "Remarks", key: "remarks" },
  ];

  rows.forEach((r) => {
    sheet.addRow({
      category: r.category,
      party: r.party_name,
      amount: r.amount,
      dueDate: r.due_date ?? "",
      status: r.status,
      remarks: r.remarks ?? "",
    });
  });

  headerRow(sheet);

  await downloadWorkbook(workbook, `Pending_Payments_Report_${subdivisionName}.xlsx`);
}
