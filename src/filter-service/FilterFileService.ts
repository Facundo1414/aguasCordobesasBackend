import { Injectable } from '@nestjs/common';
import { FilterNumService } from './FilterNumService';
import { FilterPlanService } from './FilterPlanService';
import * as xlsx from 'xlsx';

@Injectable()
export class FilterFileService {
  constructor(
    private readonly filterNumService: FilterNumService,
    private readonly filterPlanService: FilterPlanService
  ) {}

  async processFile(filePath: string): Promise<void> {
    try {
      // Filtrar números y obtener los archivos generados
      const { filteredFile, notWhatsAppFile } = await this.filterNumService.filterNumbers(filePath);

      // Leer el archivo de números que no tienen WhatsApp y generarlo
      const notWhatsAppData = this.readExcelFile(notWhatsAppFile);
      if (notWhatsAppData.length > 1) {
        this.writeExcelFile(notWhatsAppData, `not-whatsapp-${Date.now()}.xlsx`, 'Not WhatsApp');
      }

      // Leer el archivo filtrado
      const jsonData: any[] = this.readExcelFile(filteredFile);

      // Filtrar planes y obtener las filas removidas
      const { pa01Plans, otherPlans, removedPlans } = await this.filterPlanService.filterPlans(jsonData);

      // Generar los archivos Excel si los datos no están vacíos
      if (pa01Plans.length > 0) {
        this.writeExcelFile(pa01Plans, `pa01-plans-${Date.now()}.xlsx`, 'PA01 Plans');
      }

      if (otherPlans.length > 0) {
        this.writeExcelFile(otherPlans, `other-plans-${Date.now()}.xlsx`, 'Other Plans');
      }

      if (removedPlans.length > 0) {
        this.writeExcelFile(removedPlans, `removed-plans-${Date.now()}.xlsx`, 'Removed Plans');
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }

  // Método auxiliar para leer archivos Excel
  private readExcelFile(filePath: string): any[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  }

  // Método auxiliar para escribir archivos Excel
  private writeExcelFile(data: any[], outputFilePath: string, sheetName: string): void {
    if (data.length === 0) {
      console.log(`No data to write for ${sheetName}`);
      return;
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(data, { skipHeader: true });
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    xlsx.writeFile(workbook, outputFilePath);
    console.log(`${sheetName} file created at ${outputFilePath}`);
  }
}
