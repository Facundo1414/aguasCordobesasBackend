import { Controller, Post, Param, Get, Logger, Res, Query } from '@nestjs/common';
import { Response } from 'express'; // Asegúrate de importar Response desde express
import * as path from 'path';
import { FileStorageService } from 'src/DB/FileStorageService';
import { WhatsAppService } from 'src/whatsapp-service/WhatsappService';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { readExcelFile, writeExcelFile, emptyDownloadsFolder, writeExcelFileForDownload } from '../../files/utils/ExcelTools';
import * as fs from 'fs';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(
    private readonly scrapingService: ScrapingService,    
    private readonly fileStorageService: FileStorageService,
  ) {
    
  }
  private logger: Logger = new Logger(ScrapingController.name);

  @Get()
  async getScrapingData(@Query('UFnumber') UFnumber: string): Promise<string> {
    return await this.scrapingService.scrape(UFnumber);
  }

  @Post("/getNoDebts/:fileName")
  async getNoDebts(@Param('fileName') fileName: string, @Res() res: Response): Promise<void>{
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
        this.logger.log(`Archivo temporal ${tempFilePath} eliminado.`);
      }

      // Enviar respuesta al cliente
      if (excelBuffer) {
        res.setHeader('Content-Disposition', 'attachment; filename=clientes-sin-deuda.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.status(200).send(excelBuffer);

      } else {
        res.status(200).json({
          message: 'Proceso completado con éxito, no se encontraron clientes sin deuda.'
        });
      }

    } catch (error) {
      this.logger.error('Ocurrió un error durante el procesamiento:', error);
      res.status(500).json({
        message: 'Ocurrió un error durante el procesamiento.',
        error: error.message
      });
    }
  }
}
