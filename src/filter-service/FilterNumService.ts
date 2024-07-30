import { Injectable } from '@nestjs/common';
import { WhatsAppService } from 'src/whatsapp-service/WhatsappService';
import * as XLSX from 'xlsx';

@Injectable()
export class FilterNumService {
  constructor(private readonly whatsappService: WhatsAppService) {}

  async filterNumbers(filePath: string): Promise<string> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const filteredData = [];

    for (const row of jsonData) {
      const col1 = row[1];
      const col2 = row[2];
      const isValidCol1 = col1 && await this.whatsappService.isWhatsAppUser(col1);
      const isValidCol2 = col2 && await this.whatsappService.isWhatsAppUser(col2);
      if (isValidCol1 || isValidCol2) {
        filteredData.push(row);
      }
    }

    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.aoa_to_sheet(filteredData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'FilteredData');

    const outputFilePath = `filtered-${Date.now()}.xlsx`;
    XLSX.writeFile(newWorkbook, outputFilePath);
    return outputFilePath;
  }
}
