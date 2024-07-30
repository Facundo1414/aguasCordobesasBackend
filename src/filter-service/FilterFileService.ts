import { Injectable } from '@nestjs/common';
import { FilterNumService } from './FilterNumService';
import { FilterPlanService } from './FilterPlanService';
import * as fs from 'fs';
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

      // Leer el archivo filtrado
      const workbook = xlsx.readFile(filteredFile);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet);

      // Filtrar planes
      const planFilteredData = await this.filterPlanService.filterPlans(jsonData);

      // Generar el archivo final basado en los datos filtrados
      const finalWorkbook = xlsx.utils.book_new();
      const finalWorksheet = xlsx.utils.json_to_sheet(planFilteredData);
      xlsx.utils.book_append_sheet(finalWorkbook, finalWorksheet, 'FinalData');

      const finalOutputFilePath = `final-${Date.now()}.xlsx`;
      xlsx.writeFile(finalWorkbook, finalOutputFilePath);
      
      console.log(`Final file created at ${finalOutputFilePath}`);
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }
}
