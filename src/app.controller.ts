import { Body, Controller, Get, HttpStatus, Param, Post, Query, Res, Session, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { WhatsAppService } from './whatsapp-service/WhatsappService';
import { Response } from 'express';
import { FileStorageService } from './DB/FileStorageService';
import { AuthGuard } from './users/auth/auth.guard';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService,
              private readonly whatsappService: WhatsAppService,
              private readonly fileStorageService: FileStorageService) {}

  @UseGuards(AuthGuard) // Aplica el guard
  @Get('qrcode')
  async getQRCode(@Session() session: Record<string, any>, @Res() res: Response) {
    const userId = session.userId; // Obtén el userId de la sesión
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

    try {
      const qrPath = await this.whatsappService.getQRCode(userId);
      res.sendFile(qrPath);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      res.status(HttpStatus.NOT_FOUND).send('QR Code not available yet.');
    }
  }

  @UseGuards(AuthGuard) // Aplica el guard
  @Get("isLoggedIn")
  async getIsLoggedIn(@Session() session: Record<string, any>, @Res() res: Response) {
    const userId = session.userId; // Obtén el userId de la sesión
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

    try {
      const isLoggedIn = await this.whatsappService.isWhatsAppUser("5493513479404", userId);

      if (isLoggedIn) {
        return res.status(HttpStatus.OK).json({ isLoggedIn: true });
      } else {
        return res.status(HttpStatus.OK).json({ isLoggedIn: false });
      }
    } catch (error) {
      console.error('Error checking if user is logged in:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An error occurred while checking the user.' });
    }
  }


  @UseGuards(AuthGuard) // Aplica el guard 
  @Get('getFileByName/:fileName')
  async getFileByName(
    @Param('fileName') fileName: string, 
    @Session() session: Record<string, any>,
    @Res() res: Response
  ) {

    try {
      const filePath = await this.fileStorageService.getFilePath(fileName);

      // Envía el archivo al frontend
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(HttpStatus.NOT_FOUND).send('File not found.');
    }
  }
}
