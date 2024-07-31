import { Injectable } from '@nestjs/common';
import { FilterNumService } from './FilterNumService';
import { FilterPlanService } from './FilterPlanService';
import * as xlsx from 'xlsx';
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

      // Guardar archivo de números no WhatsApp
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
      if (pa01Plans.length > 0) {
        const pa01FilePath = `pa01-plans-${Date.now()}.xlsx`;
        writeExcelFile(pa01Plans, pa01FilePath, 'PA01 Plans');
        await this.fileStorageService.saveFile(
          pa01FilePath,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          userId
        );
        console.log(`PA01 Plans file created at ${pa01FilePath}`);
      }

      if (otherPlans.length > 0) {
        const otherPlansFilePath = `other-plans-${Date.now()}.xlsx`;
        writeExcelFile(otherPlans, otherPlansFilePath, 'Other Plans');
        await this.fileStorageService.saveFile(
          otherPlansFilePath,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          userId
        );
        console.log(`Other Plans file created at ${otherPlansFilePath}`);
      }

      if (removedPlans.length > 0) {
        const removedPlansFilePath = `removed-plans-${Date.now()}.xlsx`;
        writeExcelFile(removedPlans, removedPlansFilePath, 'Removed Plans');
        await this.fileStorageService.saveFile(
          removedPlansFilePath,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          userId
        );
        console.log(`Removed Plans file created at ${removedPlansFilePath}`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }
}
