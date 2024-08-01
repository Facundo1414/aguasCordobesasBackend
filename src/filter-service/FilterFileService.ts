import { Injectable } from '@nestjs/common';
import { FilterNumService } from './FilterNumService';
import { FilterPlanService } from './FilterPlanService';
import * as path from 'path';
import { readExcelFile, writeExcelFile } from '../../utils/ExcelTools';
import { FileStorageService } from 'src/file-upload/DB/FileStorageService';

@Injectable()
export class FilterFileService {
  constructor(
    private readonly filterNumService: FilterNumService,
    private readonly filterPlanService: FilterPlanService,
    private readonly fileStorageService: FileStorageService
  ) {}

  async processFile(filePath: string, userId: number): Promise<void> {
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

      // Leer el archivo filtrado
      const jsonData: any[] = readExcelFile(filteredFile);

      // Filtrar planes y obtener las filas removidas
      const { pa01Plans, otherPlans, removedPlans } = await this.filterPlanService.filterPlans(jsonData);

      // Guardar archivos de planes
      let tempPlanFiles: string[] = [];
      const tempDir = this.fileStorageService.getTempDir();

      if (pa01Plans.length > 0) {
        const pa01FilePath = path.join(tempDir, `pa01-plans-${Date.now()}.xlsx`);
        writeExcelFile(pa01Plans, pa01FilePath, 'PA01 Plans');
        tempPlanFiles.push(pa01FilePath);
      }

      if (otherPlans.length > 0) {
        const otherPlansFilePath = path.join(tempDir, `other-plans-${Date.now()}.xlsx`);
        writeExcelFile(otherPlans, otherPlansFilePath, 'Other Plans');
        tempPlanFiles.push(otherPlansFilePath);
      }

      if (removedPlans.length > 0) {
        const removedPlansFilePath = path.join(tempDir, `removed-plans-${Date.now()}.xlsx`);
        writeExcelFile(removedPlans, removedPlansFilePath, 'Removed Plans');
        tempPlanFiles.push(removedPlansFilePath);
      }

      // Guardar los archivos finales y eliminar los temporales
      for (const tempFile of tempPlanFiles) {
        await this.fileStorageService.saveFile(
          tempFile,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          userId
        );
        await this.fileStorageService.deleteTempFile(tempFile);
      }

      // Eliminar archivo temporal de números filtrados
      await this.fileStorageService.deleteTempFile(filteredFile);

      console.log("Filter File Service Finished.");
      
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }
}
