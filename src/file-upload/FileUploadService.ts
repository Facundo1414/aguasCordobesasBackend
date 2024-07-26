import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import * as xlsx from 'xlsx';

@Injectable()
export class FileUploadService {
  async handleFileUpload(file: Express.Multer.File) {
    const filePath = join(__dirname, '..', 'uploads', file.filename);

    // Guardar el archivo en el sistema de archivos
    fs.writeFileSync(filePath, file.buffer);

    // Leer el archivo Excel - Obtiene el nombre de la primera hoja y la referencia a la hoja.
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; //TODO: quizas aca deberia ser la 2da hoja
    const worksheet = workbook.Sheets[sheetName];

    // Convertir la hoja de cálculo a JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Asegúrate de que jsonData sea un array de arrays
    if (!Array.isArray(jsonData) || !Array.isArray(jsonData[0])) {
      throw new Error('El formato del archivo no es válido');
    }
    console.log(jsonData);
    

    // Typecast jsonData to any[][]
    const dataArray: any[][] = jsonData as any[][];

    // Extraer datos específicos
    const extractedData = this.extractData(dataArray);

    return {
      message: 'Archivo subido exitosamente',
      filePath,
      data: extractedData,
    };
  }

  extractData(data: any[][]): any[] {
    const extractedData = data.slice(1).map(row => ({
      unidad: row[0],
      telefono: row[1],
      tipo_plan: row[4],
    }));

    console.log(extractedData);

    return extractedData;
  }
}
