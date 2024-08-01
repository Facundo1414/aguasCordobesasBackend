import * as xlsx from 'xlsx';

export function readExcelFile(filePath: string): any[] {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet, { header: 1 });
}

export function writeExcelFile(data: any[], outputFilePath: string, sheetName: string): void {
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(data, { skipHeader: true });
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  xlsx.writeFile(workbook, outputFilePath);
}