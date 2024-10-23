// file-processing.service.ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from 'src/DB/FileStorageService';
import { WhatsAppService } from 'src/whatsapp-service/WhatsappService';
import { readExcelFile, writeExcelFileForDownload, emptyDownloadsFolder } from '../../files/utils/ExcelTools';
import * as fs from 'fs';
import * as path from 'path';
import { ScrapingService } from '../scraping/scraping.service';
import { ProcessGateway } from '../utils/process.gateway';

@Injectable()
export class FileProcessingService {
  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly scrapingService: ScrapingService,
    private readonly whatsAppService: WhatsAppService,
    private readonly processGateway: ProcessGateway,
  ) {}

  async processFile(filename: string, message: string, expiration: number, userId: string) {
    const filePath = await this.fileStorageService.getFilePath(filename);
    const downloadsPath = path.join(__dirname, '..', 'stage-two/downloads');
    const tempFilePath = path.join(__dirname, '..', 'temp', filename); // Ruta del archivo temporal
    const jsonData = readExcelFile(filePath);

    const scrapingPromises = jsonData.slice(1).map(async (row) => {
      const clientUF = row[0]?.toString().trim();
      const clientPhoneNumber = row[1]?.toString().trim() || row[2]?.toString().trim();
      const clientName = row[13]?.toString().trim();

      if (clientUF && clientPhoneNumber && clientName) {
        try {
          const pdfPath = await this.scrapingService.scrape(clientUF, expiration);
          if (pdfPath) {
            await this.whatsAppService.sendPDF(clientPhoneNumber, clientName, pdfPath, message, userId);
            this.processGateway.sendLogMessage(`Mensaje enviado a ${clientName} (${clientPhoneNumber})`);
            // Eliminar el archivo PDF temporal después de enviarlo
            fs.unlinkSync(pdfPath);
          } else {
            this.processGateway.sendLogMessage(`No hay PDF disponible para ${clientName} (UF: ${clientUF}). Posiblemente no hay deuda.`);
          }
        } catch (error) {
          this.processGateway.sendLogMessage(`Error al procesar ${clientName} (UF: ${clientUF}): ${error.message}`);
        }
      } else {
        this.processGateway.sendLogMessage(`Datos incompletos para ${clientName} (UF: ${clientUF})`);
      }
    });

    // Esperar a que todas las tareas de scraping se completen
    await Promise.all(scrapingPromises);

    // Recuperar los UFs sin deuda
    const clientesSinDeuda = await this.scrapingService.getUFsWithoutDebt();

    let excelBuffer: Buffer | null = null;
    if (clientesSinDeuda && clientesSinDeuda.length > 0) {
      // Filtrar los datos originales del Excel para incluir solo las filas con UF en clientesSinDeuda
      const headers = jsonData[0]; // Suponiendo que la primera fila contiene encabezados
      const clientesSinDeudaRows = jsonData.filter((row) =>
        clientesSinDeuda.includes(row[0]?.toString().trim())
      );

      // Convertir las filas a objetos con encabezados como claves
      const dataToWrite = clientesSinDeudaRows.map(row => {
        const rowObject: { [key: string]: any } = {};
        headers.forEach((header, index) => {
          rowObject[header] = row[index];
        });
        return rowObject;
      });

      // Generar el archivo Excel en memoria
      excelBuffer = writeExcelFileForDownload(dataToWrite, 'ClientesSinDeuda');
    }

    // Limpiar la carpeta de descargas después de que todas las tareas se hayan completado
    emptyDownloadsFolder(downloadsPath);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return excelBuffer; // Retorna el buffer del Excel generado
  }
}
