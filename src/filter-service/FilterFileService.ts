import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { readExcelFile, writeExcelFile } from '../../utils/ExcelTools';
import { FileStorageService } from 'src/file-upload/DB/FileStorageService';
import { FilterNumService } from './FilterNumService';
import { FilterPlanService } from './FilterPlanService';

@Injectable()
export class FilterFileService {
  constructor(
    private readonly filterNumService: FilterNumService,
    private readonly filterPlanService: FilterPlanService,
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

      // Leer el archivo filtrado
      const jsonData: any[] = readExcelFile(filteredFile);

      // Filtrar planes y obtener las filas removidas
      const { pa01Plans, otherPlans, removedPlans } = await this.filterPlanService.filterPlans(jsonData);

      // Guardar archivos de planes
      let tempPlanFiles: string[] = [];
      const tempDir = this.fileStorageService.getTempDir();
      let savedFileNames: string[] = [path.basename(notWhatsAppFile)];

      if (pa01Plans.length > 0) {
        const pa01FilePath = path.join(tempDir, `pa01-plans-${Date.now()}.xlsx`);
        // Incluir el encabezado junto con las filas de datos
        const pa01PlanData = [jsonData[0], ...pa01Plans]; // Aquí se asume que jsonData[0] es el encabezado
        writeExcelFile(pa01PlanData, pa01FilePath, 'PA01 Plans');
        tempPlanFiles.push(pa01FilePath);
        savedFileNames.push(path.basename(pa01FilePath));

        console.log(`PA01 Plans file created at ${pa01FilePath}`);
      }

      if (otherPlans.length > 0) {
        const otherPlansFilePath = path.join(tempDir, `other-plans-${Date.now()}.xlsx`);
        // Incluir el encabezado junto con las filas de datos
        const otherPlansData = [jsonData[0], ...otherPlans]; // Aquí se asume que jsonData[0] es el encabezado
        writeExcelFile(otherPlansData, otherPlansFilePath, 'Other Plans');
        tempPlanFiles.push(otherPlansFilePath);
        savedFileNames.push(path.basename(otherPlansFilePath));

        console.log(`Other Plans file created at ${otherPlansFilePath}`);
      }

      if (removedPlans.length > 0) {
        const removedPlansFilePath = path.join(tempDir, `removed-plans-${Date.now()}.xlsx`);
        // Incluir el encabezado junto con las filas de datos
        const removedPlansData = [jsonData[0], ...removedPlans]; // Aquí se asume que jsonData[0] es el encabezado
        writeExcelFile(removedPlansData, removedPlansFilePath, 'Removed Plans');
        tempPlanFiles.push(removedPlansFilePath);

        console.log(`Removed files has been removed`);
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
      
      // Retornar los nombres de los archivos guardados
      return savedFileNames;
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  }
}
