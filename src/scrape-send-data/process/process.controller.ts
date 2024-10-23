import { Controller, Post, Res, Body, Session, Get } from '@nestjs/common';
import { Response } from 'express';
import { FileProcessingService } from './file-processing.service';
import { ProcessFileDto } from './dto/process-file.dto';
import { ErrorHandlerService } from './error-handler.service';
import { Messages } from './constants/messages';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('process')
export class ProcessController {
  constructor(
    private readonly fileProcessingService: FileProcessingService,
    private readonly errorHandler: ErrorHandlerService,
    @InjectQueue('scraping') private readonly scrapingQueue: Queue, // Cola para tareas de scraping
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue // Cola para tareas de envío de WhatsApp
  ) {}

  @Post('process-file')
  async processFile(
    @Session() session: Record<string, any>, // Accede a la sesión
    @Body() body: ProcessFileDto,
    @Res() res: Response
  ): Promise<void> {
    const userId = session.userId; // Obtén el userId de la sesión
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return; // Asegúrate de retornar después de enviar la respuesta
    }

    try {
      const excelBuffer = await this.fileProcessingService.processFile(body.filename, body.message, body.expiration, userId);

      // Enviar respuesta al cliente
      if (excelBuffer) {
        res.setHeader('Content-Disposition', 'attachment; filename=clientes-sin-deuda.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.status(200).send(excelBuffer);
      } else {
        res.status(200).json({ message: Messages.FILE_PROCESSED });
      }
    } catch (error) {
      this.errorHandler.handleError('Ocurrió un error durante el procesamiento:', error);
      res.status(500).json({
        message: Messages.ERROR_PROCESSING,
        error: error.message
      });
    }
  }

  @Get('status')
  async getStatus() {
    // Recuperar el conteo de trabajos de las colas de scraping y WhatsApp
    const scrapingJobs = await this.scrapingQueue.getJobCounts();
    const whatsappJobs = await this.whatsappQueue.getJobCounts();

    return {
      scraping: scrapingJobs, // Retorna conteo de trabajos en la cola de scraping
      whatsapp: whatsappJobs, // Retorna conteo de trabajos en la cola de WhatsApp
    };
  }
}
