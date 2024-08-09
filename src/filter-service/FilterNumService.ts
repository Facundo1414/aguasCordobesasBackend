import { Injectable } from '@nestjs/common';
import { WhatsAppService } from 'src/whatsapp-service/WhatsappService';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { FileStorageService } from 'src/file-upload/DB/FileStorageService';
import * as fs from 'fs';

@Injectable()
export class FilterNumService {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly fileStorageService: FileStorageService // Inyecta el nuevo servicio
  ) {}

  private formatPhoneNumber(phoneNumber: string): string {
    const cleanedNumber = phoneNumber.replace(/\D/g, ''); // Elimina cualquier carácter no numérico

    if (cleanedNumber.startsWith('351')) {
      return `5409${cleanedNumber}`;
    } else if (cleanedNumber.startsWith('15')) {
      return `5409351${cleanedNumber.substring(2)}`;
    } else {
      return phoneNumber;
    }
  }

  async filterNumbers(filePath: string): Promise<{ filteredFile: string; notWhatsAppFile: string }> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = jsonData[0]; // Guardar los encabezados
    const filteredData = [headers]; // Incluir los encabezados en los datos filtrados
    const notWhatsAppData = [headers]; // Incluir los encabezados en los datos no WhatsApp

    for (const row of jsonData.slice(1)) { // Omitir los encabezados
      const col1 = row[1] ? this.formatPhoneNumber(row[1].toString()) : "";
      const col2 = row[2] ? this.formatPhoneNumber(row[2].toString()) : "";

      const isValidCol1 = col1 && await this.whatsappService.isWhatsAppUser(col1);
      const isValidCol2 = col2 && await this.whatsappService.isWhatsAppUser(col2);

      if (isValidCol1 || isValidCol2) {
        row[1] = col1; // Reemplazar el número formateado
        row[2] = col2; // Reemplazar el número formateado
        filteredData.push(row);
      } else {
        notWhatsAppData.push(row);
      }
    }

    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.aoa_to_sheet(filteredData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'FilteredData');
    

    const notWhatsAppWorkbook = XLSX.utils.book_new();
    const notWhatsAppWorksheet = XLSX.utils.aoa_to_sheet(notWhatsAppData);
    XLSX.utils.book_append_sheet(notWhatsAppWorkbook, notWhatsAppWorksheet, 'NotWhatsAppData');

    // Asegurarse de que el directorio temporal existe
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const filteredFilePath = path.join(tempDir, `filtered-${Date.now()}.xlsx`);
    XLSX.writeFile(newWorkbook, filteredFilePath);

    const notWhatsAppFilePath = path.join(tempDir, `not-whatsapp-${Date.now()}.xlsx`);
    XLSX.writeFile(notWhatsAppWorkbook, notWhatsAppFilePath);

    return { filteredFile: filteredFilePath, notWhatsAppFile: notWhatsAppFilePath };
  }
}
