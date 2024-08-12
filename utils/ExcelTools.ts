import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export function readExcelFile(filePath: string): any[] {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet, { header: 1 });
}

export function writeExcelFile(data: any[], outputFilePath: string, sheetName: string): void {
  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(data, { skipHeader: true });
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  xlsx.writeFile(workbook, outputFilePath);
}

export function emptyDownloadsFolder(directoryPath: string): void {
  try {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Si es un directorio, eliminar su contenido de manera recursiva
        emptyDownloadsFolder(filePath);
        // Luego eliminar el directorio vacío
        fs.rmdirSync(filePath);
      } else {
        // Si es un archivo, eliminarlo
        fs.unlinkSync(filePath);
      }
    }
    console.log(`La carpeta ${directoryPath} ha sido vaciada.`);
  } catch (error) {
    console.error(`Error al vaciar la carpeta ${directoryPath}:`, error);
  }
}

