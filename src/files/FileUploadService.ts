import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { join } from 'path';
import { FilterFileService } from './filter-file-service/FilterFileService';

@Injectable()
export class FileUploadService {

  constructor(private readonly filterFileService: FilterFileService) {}

  async handleFileUpload(file: Express.Multer.File) {
    // Construir la ruta completa del archivo
    const filePath = join(__dirname, '..', 'uploads', file.filename);
    
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      if (!Array.isArray(jsonData) || !Array.isArray(jsonData[0])) {
        throw new Error('El formato del archivo no es válido');
      }

      const savedFileNames = await this.filterFileService.processFile(filePath, 1);

      // Eliminar el archivo después de procesarlo
      fs.unlinkSync(filePath);

      return {
        message: 'Archivo subido y procesado exitosamente',
        savedFileNames,
      };
    } catch (error) {
      console.error('Error processing file:', error);
      throw new BadRequestException('Error procesando el archivo');
    }
  }
}
