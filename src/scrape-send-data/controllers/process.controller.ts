import { Controller, Post, Res, Body, Session, Get, UseGuards, HttpStatus, Request } from '@nestjs/common';
import { Response } from 'express';
import { FileProcessingService } from '../services/file-processing.service';
import { ProcessFileDto } from '../models/dto/process-file.dto';
import { ErrorHandlerService } from '../services/error-handler.service';
import { Messages } from '../models/constants/messages';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AuthGuard } from 'src/users/services/auth.guard';
import { UserService } from 'src/users/services/users.service';
import * as jwt from 'jsonwebtoken';

@Controller('process')
export class ProcessController {
  constructor(
    private readonly fileProcessingService: FileProcessingService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly userService: UserService,
    @InjectQueue('scraping') private readonly scrapingQueue: Queue, // Cola para tareas de scraping
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue // Cola para tareas de envío de WhatsApp
  ) {}


  private async extractUserIdFromToken(token: string): Promise<string | null> {
    if (!token) {
      console.error('No token provided.');
      return null;
    }

    try {
      const secret = process.env.JWT_SECRET || 'Secret not set';
      const decoded: any = jwt.verify(token, secret);

      if (decoded.userId) {
        return decoded.userId;
      }
      
      if (decoded.username) {
        const user = await this.userService.findUserByUsername(decoded.username);
        return user ? user.id.toString() : null;
      }

      console.error('Neither User ID nor username found in token payload.');
      return null;
    } catch (error) {
      console.error('Error decoding token:', error.message);
      return null;
    }
  }


  @Post('process-file')
  @UseGuards(AuthGuard)
  async processFile(
    @Request() req: any,
    @Body() body: ProcessFileDto,
    @Res() res: Response
  ): Promise<void> {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);

    if (!userId) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
      return; // No return value here, just ending the function
    }

    try {
      const excelBuffer = await this.fileProcessingService.processFile(body.filename, body.message, body.expiration, userId);

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
  @UseGuards(AuthGuard) // Aplica el guard
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
