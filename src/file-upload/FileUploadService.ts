import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { join } from 'path';
import { FilterFileService } from 'src/filter-service/FilterFileService';

@Injectable()
export class FileUploadService {

  constructor(private readonly filterFileService: FilterFileService) {}

  async handleFileUpload(file: Express.Multer.File) {
    // Construir la ruta completa del archivo
    const filePath = join(__dirname, '..', 'uploads', file.filename);
        if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    // Leer el archivo desde el sistema de archivos
    const fileBuffer = fs.readFileSync(filePath);
    
    // Leer el archivo Excel
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir la hoja de cálculo a JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Asegúrate de que jsonData sea un array de arrays
    if (!Array.isArray(jsonData) || !Array.isArray(jsonData[0])) {
      throw new Error('El formato del archivo no es válido');
    }




    // LLAMAR AL SERVICIO DE FILTRO
    //const extractedData = this.extractData(jsonData as any[][]);
    await this.filterFileService.processFile(file.path);


    return {
      message: 'Archivo subido exitosamente',
      filePath,
      data: "extractedData",
    };
  }

  extractData(data: any[][]): any[] {
    return data.slice(1).map(row => ({
      unidad: row[0],
      telefono_unidad: row[1],
      telefono_cliente: row[2],
      tipo_plan: row[4],
    }));
  }
}
