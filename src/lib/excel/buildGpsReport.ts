import { downloadWorkbook, headerRow } from "./download";
import type { GpsLog } from "@/types/database";

type Row = GpsLog & { machines: { machine_name: string } | null };

export async function buildGpsReport(rows: Row[], subdivisionName: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("GPS Report");

  sheet.columns = [
    { header: "Recorded At", key: "recordedAt" },
    { header: "Machine", key: "machine" },
    { header: "Latitude", key: "lat" },
    { header: "Longitude", key: "lng" },
    { header: "Location", key: "label" },
  ];

  rows.forEach((r) => {
    sheet.addRow({
      recordedAt: new Date(r.recorded_at).toLocaleString(),
      machine: r.machines?.machine_name ?? "",
      lat: r.latitude,
      lng: r.longitude,
      label: r.location_label ?? "",
    });
  });

  headerRow(sheet);

  await downloadWorkbook(workbook, `GPS_Report_${subdivisionName}.xlsx`);
}
