import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { join } from 'path';
import { FilterFileService } from './FilterFileService';
import { FileStorageService } from './FileStorageService';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from '../models/File.entity';

const PROCESSED_DIR = join(__dirname, '..', 'processed_files'); // Directorio donde se almacenarán los archivos procesados

if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true }); // Crear el directorio si no existe
}

@Injectable()
export class FileUploadService {

  constructor(
    private readonly filterFileService: FilterFileService,
    private readonly fileStorageService: FileStorageService,
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>
  ) {}

  // Método para manejar la carga de archivos
  async handleFileUpload(file: Express.Multer.File, userId: string) {
    // Ruta completa del archivo cargado
    const filePath = join(__dirname, '..', 'uploads', file.filename);
    
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    try {
      // Leer el archivo cargado
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = await xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      // Validar el formato del archivo
      if (!Array.isArray(jsonData) || !Array.isArray(jsonData[0])) {
        throw new Error('Invalid file format');
      }
      console.log("User ID in file service: " + userId);

      // Verificar si el archivo ya ha sido procesado
      const isProcessed = await this.fileStorageService.isFileProcessed(file.filename);
      
      if (isProcessed) {
        throw new BadRequestException('File has already been processed');
      }

      // Procesar el archivo 
      const savedFileNames = await this.filterFileService.processFile(filePath, userId);

      // Marcar el archivo como procesado
      await this.markFileAsProcessed(file.filename);

      // Eliminar el archivo temporal después del procesamiento
      fs.unlinkSync(filePath);

      return {
        message: 'File successfully uploaded and processed',
        savedFileNames,
      };
    } catch (error) {
      console.error('Error processing file:', error);
      throw new BadRequestException('Error processing file');
    }
  }

  // Método para verificar si un archivo ya fue procesado
  async isFileProcessed(filename: string): Promise<boolean> {
    const filePath = join(PROCESSED_DIR, `${filename}.processed`);
    return fs.existsSync(filePath); // Retorna true si el archivo de control existe
  }

  // Método para marcar un archivo como procesado
  async markFileAsProcessed(filename: string): Promise<void> {
    await this.fileRepository.update({ filename }, { processed: true });
  }
  
  
}
