import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { readExcelFile, writeExcelFile } from '../../files/utils/ExcelTools';
import { FileStorageService } from 'src/DB/FileStorageService';
import { FilterNumService } from './FilterNumService';

@Injectable()
export class FilterFileService {
  constructor(
    private readonly filterNumService: FilterNumService,
    private readonly fileStorageService: FileStorageService
  ) {}

  async processFile(filePath: string, userId: number): Promise<string[]> {
    try {
      // Filtrar números y obtener los archivos generados
      const { filteredFile, notWhatsAppFile } = await this.filterNumService.filterNumbers(filePath);

      // Guardar archivo de números no WhatsApp en la base de datos
      await this.fileStorageService.saveFile(
        notWhatsAppFile,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        userId
      );
      console.log(`Not WhatsApp file created at ${notWhatsAppFile}`);

      // Leer el archivo filtrado de clientes con WhatsApp
      const jsonData: any[] = readExcelFile(filteredFile);

      // Generar el archivo para los clientes con WhatsApp
      const tempDir = this.fileStorageService.getTempDir();
      const clientsWithWhatsAppFilePath = path.join(tempDir, `clients-with-whatsapp-${Date.now()}.xlsx`);

      // Incluir el encabezado junto con las filas de datos
      const clientsWithWhatsAppData = [jsonData[0], ...jsonData.slice(1)]; // jsonData[0] es el encabezado
      writeExcelFile(clientsWithWhatsAppData, clientsWithWhatsAppFilePath, 'Clients with WhatsApp');

      // Guardar el archivo de clientes con WhatsApp en la base de datos
      await this.fileStorageService.saveFile(
        clientsWithWhatsAppFilePath,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        userId
      );
      console.log(`Clients with WhatsApp file created at ${clientsWithWhatsAppFilePath}`);

      // Eliminar archivo temporal de números filtrados
      await this.fileStorageService.deleteTempFile(filteredFile);

      // Eliminar archivo temporal de clientes con WhatsApp
      await this.fileStorageService.deleteTempFile(clientsWithWhatsAppFilePath);

      console.log("Filter File Service Finished.");
      
      // Retornar los nombres de los archivos guardados
      return [
        path.basename(notWhatsAppFile),
        path.basename(clientsWithWhatsAppFilePath)
      ];
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  }
}
