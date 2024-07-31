import { Injectable } from '@nestjs/common';
import { FilterNumService } from './FilterNumService';
import { FilterPlanService } from './FilterPlanService';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from 'src/file-upload/DB/FileService';
import { readExcelFile, writeExcelFile } from '../../utils/ExcelTools';

@Injectable()
export class FilterFileService {
  constructor(
    private readonly filterNumService: FilterNumService,
    private readonly filterPlanService: FilterPlanService,
    private readonly fileService: FileService
  ) {}

  async processFile(filePath: string): Promise<void> {
    try {
      // Filtrar números y obtener los archivos generados
      const { filteredFile, notWhatsAppFile } = await this.filterNumService.filterNumbers(filePath);

      // Leer el archivo de números que no tienen WhatsApp y generarlo
      const notWhatsAppData = readExcelFile(notWhatsAppFile);
      const notWhatsAppFilePath = `not-whatsapp-${Date.now()}.xlsx`;
      if (notWhatsAppData.length > 1) {
        writeExcelFile(notWhatsAppData, notWhatsAppFilePath , 'Not WhatsApp');
      }
      // Guardar archivo de números no WhatsApp
      const notWhatsAppFileEntry = await this.fileService.saveFile(
        notWhatsAppFilePath,
        path.join(__dirname, notWhatsAppFilePath),
        1 // Aquí se usa un ID de usuario estático, puedes ajustarlo según sea necesario
      );
      console.log(`Not WhatsApp file created at ${notWhatsAppFilePath}`);


      // Leer el archivo filtrado
      const jsonData: any[] = readExcelFile(filteredFile);

      // Filtrar planes y obtener las filas removidas
      const { pa01Plans, otherPlans, removedPlans } = await this.filterPlanService.filterPlans(jsonData);

      // Guardar archivos de planes
      if (pa01Plans.length > 0) {
        const pa01FilePath = `pa01-plans-${Date.now()}.xlsx`;
        writeExcelFile(pa01Plans, pa01FilePath, 'PA01 Plans');
        const pa01FileEntry = await this.fileService.saveFile(
          pa01FilePath,
          path.join(__dirname, pa01FilePath),
          1
        );
        console.log(`PA01 Plans file created at ${pa01FilePath}`);
      }

      if (otherPlans.length > 0) {
        const otherPlansFilePath = `other-plans-${Date.now()}.xlsx`;
        writeExcelFile(otherPlans, otherPlansFilePath, 'Other Plans');
        const otherPlansFileEntry = await this.fileService.saveFile(
          otherPlansFilePath,
          path.join(__dirname, otherPlansFilePath),
          1
        );
        console.log(`Other Plans file created at ${otherPlansFilePath}`);
      }

      if (removedPlans.length > 0) {
        const removedPlansFilePath = `removed-plans-${Date.now()}.xlsx`;
        writeExcelFile(removedPlans, removedPlansFilePath, 'Removed Plans');
        const removedPlansFileEntry = await this.fileService.saveFile(
          removedPlansFilePath,
          path.join(__dirname, removedPlansFilePath),
          1
        );
        console.log(`Removed Plans file created at ${removedPlansFilePath}`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }


}
