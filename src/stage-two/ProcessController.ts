import { Controller, Post, Param, Get, Logger } from '@nestjs/common';
import * as path from 'path';
import { FileStorageService } from 'src/file-upload/DB/FileStorageService';
import { WhatsAppService } from 'src/whatsapp-service/WhatsappService';
import { ScrapingService } from './scraping/scraping.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { readExcelFile, writeExcelFile } from '../../utils/ExcelTools';
import { emptyDownloadsFolder } from "../../utils/ExcelTools";
import * as fs from 'fs';

@Controller('process')
export class ProcessController {
  private logger: Logger = new Logger(ProcessController.name);

  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly scrapingService: ScrapingService,
    private readonly whatsAppService: WhatsAppService,
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue
  ) {}

  @Post('process-file/:fileName')
  async processFile(@Param('fileName') fileName: string): Promise<void> {
    try {
      const filePath = await this.fileStorageService.getFilePath(fileName);
      const downloadsPath = path.join(__dirname, '..', 'stage-two/downloads');
      const tempFilePath = path.join(__dirname, '..', 'temp', fileName); // Ruta del archivo temporal
      const jsonData = readExcelFile(filePath);
  
      const scrapingPromises = jsonData.slice(1).map(async (row) => {
        const clientUF = row[0]?.toString().trim();
        const clientPhoneNumber = row[1]?.toString().trim() || row[2]?.toString().trim();
        const clientName = row[6]?.toString().trim();
  
        if (clientUF && clientPhoneNumber && clientName) {
          try {
            const pdfPath = await this.scrapingService.scrape(clientUF);
  
            if (pdfPath) {
              await this.whatsAppService.sendPDF(clientPhoneNumber, clientName, pdfPath);
  
              // Eliminar el archivo PDF temporal después de enviarlo
              fs.unlinkSync(pdfPath);
              this.logger.log(`Archivo temporal ${pdfPath} eliminado.`);
            } else {
              this.logger.warn(`No hay PDF disponible para UF: ${clientUF}. Posiblemente no hay deuda.`);
            }
          } catch (error) {
            this.logger.error(`Error procesando UF ${clientUF}:`, error);
          }
        } else {
          this.logger.warn(`Datos incompletos para la fila: ${JSON.stringify(row)}`);
        }
      });
  
      // Esperar a que todas las tareas de scraping se completen
      await Promise.all(scrapingPromises);
  
      // Recuperar los UFs sin deuda
      const clientesSinDeuda = await this.scrapingService.getUFsWithoutDebt();
  
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
  
        // Definir la ruta para el nuevo archivo Excel
        const sinDeudaFilePath = path.join(__dirname, '..', 'stage-two', 'clientes-sin-deuda.xlsx');
  
        // Escribir los datos filtrados en un nuevo archivo Excel
        writeExcelFile(dataToWrite, sinDeudaFilePath, 'ClientesSinDeuda');
  
        this.logger.log(`Archivo de clientes sin deuda generado en: ${sinDeudaFilePath}`);
      }
  
      // Limpiar la carpeta de descargas después de que todas las tareas se hayan completado
      emptyDownloadsFolder(downloadsPath);

      // Eliminar el archivo temporal
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        this.logger.log(`Archivo temporal ${tempFilePath} eliminado.`);
      }
  
      this.logger.log('Proceso completado con éxito.');
  
    } catch (error) {
      this.logger.error('Ocurrió un error durante el procesamiento:', error);
    }
  }

  @Get('status')
  async getStatus() {
    // Retrieve the job counts from the scraping and WhatsApp queues
    const scrapingJobs = await this.scrapingQueue.getJobCounts();
    const whatsappJobs = await this.whatsappQueue.getJobCounts();

    return {
      scraping: scrapingJobs,
      whatsapp: whatsappJobs,
    };
  }
}
