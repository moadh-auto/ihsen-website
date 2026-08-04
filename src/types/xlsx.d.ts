/* ─── Shared types ─────────────────────────────────────────────────────────── */
interface XlsxCellStyle {
  font?: { bold?: boolean; color?: { rgb: string }; sz?: number; name?: string; italic?: boolean };
  fill?: { patternType?: string; fgColor?: { rgb: string }; bgColor?: { rgb: string } };
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean; readingOrder?: number };
  border?: {
    top?:    { style: string; color?: { rgb: string } };
    bottom?: { style: string; color?: { rgb: string } };
    left?:   { style: string; color?: { rgb: string } };
    right?:  { style: string; color?: { rgb: string } };
  };
  numFmt?: string;
}
interface XlsxCell {
  v: unknown;
  t?: string;
  f?: string;
  s?: XlsxCellStyle;
  z?: string;
}
interface XlsxWorkSheet {
  [cell: string]: unknown;
  '!cols'?: Array<{ wch?: number; hidden?: boolean }>;
  '!rows'?: Array<{ hpx?: number; hidden?: boolean } | null>;
  '!ref'?: string;
  '!merges'?: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>;
  '!freeze'?: { xSplit?: number; ySplit?: number; topLeftCell?: string; activePane?: string; state?: string };
  '!views'?: Array<{ rightToLeft?: boolean; state?: string; ySplit?: number; xSplit?: number }>;
}
interface XlsxWorkBook {
  SheetNames: string[];
  Sheets: Record<string, XlsxWorkSheet>;
  Props?: Record<string, string>;
}
interface XlsxUtils {
  json_to_sheet(data: Record<string, unknown>[], opts?: { header?: string[] }): XlsxWorkSheet;
  book_new(): XlsxWorkBook;
  book_append_sheet(wb: XlsxWorkBook, ws: XlsxWorkSheet, name: string): void;
  aoa_to_sheet(data: unknown[][]): XlsxWorkSheet;
  sheet_to_json<T = Record<string, unknown>>(ws: XlsxWorkSheet, opts?: { header?: number | string[] }): T[];
  encode_cell(addr: { r: number; c: number }): string;
  encode_range(s: { r: number; c: number }, e: { r: number; c: number }): string;
}

/* ─── xlsx-js-style ────────────────────────────────────────────────────────── */
declare module 'xlsx-js-style' {
  export type CellStyle  = XlsxCellStyle;
  export type Cell       = XlsxCell;
  export type WorkSheet  = XlsxWorkSheet;
  export type WorkBook   = XlsxWorkBook;
  export const utils: XlsxUtils;
  export function writeFile(wb: XlsxWorkBook, filename: string, opts?: { bookType?: string; compression?: boolean; bookSST?: boolean; cellStyles?: boolean }): void;
  export function read(data: ArrayBuffer | Uint8Array | string, opts?: { type?: string }): XlsxWorkBook;
}

/* ─── xlsx (backward compat for importExcel reader) ───────────────────────── */
declare module 'xlsx' {
  export type CellStyle  = XlsxCellStyle;
  export type Cell       = XlsxCell;
  export type WorkSheet  = XlsxWorkSheet;
  export type WorkBook   = XlsxWorkBook;
  export const utils: XlsxUtils;
  export function writeFile(wb: XlsxWorkBook, filename: string, opts?: { bookType?: string; compression?: boolean; bookSST?: boolean; cellStyles?: boolean }): void;
  export function read(data: ArrayBuffer | Uint8Array | string, opts?: { type?: string }): XlsxWorkBook;
}
