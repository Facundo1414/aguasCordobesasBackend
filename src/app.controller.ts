import { Body, Controller, Get, HttpStatus, Param, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { WhatsAppService } from './whatsapp-service/services/WhatsappService';
import { Response } from 'express';
import { FileStorageService } from './files/services/FileStorageService';
import { AuthGuard } from './users/services/auth.guard';
import * as jwt from 'jsonwebtoken';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly whatsappService: WhatsAppService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  private extractUserIdFromToken(token: string): string | null {
    // Log del token recibido
    console.log('Token received for extraction:', token);

    if (!token) {
        console.error('No token provided.');
        return null;
    }

    try {
        // Log del secreto (evita mostrarlo en producción)
        const secret = process.env.JWT_SECRET || 'Secret not set';
        console.log('Using secret for verification:', secret); // No mostrar en producción

        const decoded: any = jwt.verify(token, secret);
        
        // Log del contenido decodificado
        console.log('Decoded token:', decoded);

        // Verifica que el userId esté presente en el payload
        if (decoded.userId) {
            console.log('User ID extracted:', decoded.userId);
            return decoded.userId;
        } else {
            console.error('User ID not found in the token payload.');
            return null;
        }
    } catch (error) {
        console.error('Error decoding token:', error.message);
        // Log adicional para detalles del error
        if (error.name) {
            console.error('Error name:', error.name);
        }
        if (error.message) {
            console.error('Error message:', error.message);
        }
        return null;
    }
}


  @UseGuards(AuthGuard) // Aplica el guard
  @Get('qrcode')
  async getQRCode(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1]; // Suponiendo que el token se envía como 'Bearer <token>'
    const userId = this.extractUserIdFromToken(token);
    
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
  async getIsLoggedIn(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1]; // Suponiendo que el token se envía como 'Bearer <token>'
    const userId = this.extractUserIdFromToken(token);

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
    @Request() req: any,
    @Res() res: Response
  ) {
    const token = req.headers.authorization?.split(' ')[1]; // Suponiendo que el token se envía como 'Bearer <token>'
    const userId = this.extractUserIdFromToken(token);
    
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

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
