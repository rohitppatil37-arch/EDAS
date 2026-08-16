import type ExcelJS from "exceljs";

export const COLORS = {
  title: "FFDBEAFE",
  subHeader: "FFEEF2FF",
  tableHeader: "FFC7D2FE",
  zebra: "FFF9FAFB",
  total: "FFE0E7FF",
  totalAlt: "FFFCE5CD",
} as const;

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

const thin: Partial<ExcelJS.Border> = { style: "thin" };

export function styleTitleRow(ws: ExcelJS.Worksheet, row: number, colCount: number, fontSize = 15) {
  ws.mergeCells(row, 1, row, colCount);
  const cell = ws.getCell(row, 1);
  cell.font = { bold: true, size: fontSize };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.fill = fill(COLORS.title);
}

export function styleSubHeaderRows(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, colCount: number) {
  for (let r = fromRow; r <= toRow; r++) {
    ws.mergeCells(r, 1, r, colCount);
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = fill(COLORS.subHeader);
  }
}

export function styleTableHeader(ws: ExcelJS.Worksheet, row: number, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(row, c);
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = fill(COLORS.tableHeader);
  }
}

export function styleBorders(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, colCount: number) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      ws.getCell(r, c).border = { top: thin, left: thin, bottom: thin, right: thin };
    }
  }
}

export function styleZebra(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, colCount: number) {
  for (let r = fromRow; r <= toRow; r++) {
    if (r % 2 === 0) {
      for (let c = 1; c <= colCount; c++) {
        ws.getCell(r, c).fill = fill(COLORS.zebra);
      }
    }
  }
}

export function styleTotalRow(ws: ExcelJS.Worksheet, row: number, colCount: number, color: string = COLORS.total) {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(row, c);
    cell.font = { bold: true };
    cell.fill = fill(color);
  }
}

export function setColumnWidths(ws: ExcelJS.Worksheet, widthsPx: number[]) {
  widthsPx.forEach((px, i) => {
    ws.getColumn(i + 1).width = Math.round(px / 7);
  });
}

export function freezeRows(ws: ExcelJS.Worksheet, n: number) {
  ws.views = [{ state: "frozen", ySplit: n }];
}

export function alignColumn(ws: ExcelJS.Worksheet, col: number, fromRow: number, toRow: number, horizontal: "left" | "center" | "right") {
  for (let r = fromRow; r <= toRow; r++) {
    ws.getCell(r, col).alignment = { horizontal, vertical: "middle", wrapText: horizontal === "left" };
  }
}

export function alignRange(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, colCount: number, horizontal: "left" | "center" | "right") {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      ws.getCell(r, c).alignment = { horizontal, vertical: "middle" };
    }
  }
}

/**
 * Excel sheet names are capped at 31 chars, unlike Google Sheets' 80 — long
 * machine names that only differ near the end (e.g. a registration-number
 * suffix) collide after truncation. This hands out a unique, valid name per
 * call within one workbook.
 */
export function createSheetNamer() {
  const used = new Set<string>();
  return function nameFor(rawName: string): string {
    const base = rawName.replace(/[[\]*?/\\:]/g, " ").trim();
    const primary = base.substring(0, 31);
    if (!used.has(primary)) {
      used.add(primary);
      return primary;
    }
    for (let n = 2; ; n++) {
      const suffix = ` ${n}`;
      const candidate = base.substring(0, 31 - suffix.length) + suffix;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
  };
}
