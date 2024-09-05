import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { WhatsAppService } from './whatsapp-service/WhatsappService';
import { Response } from 'express';
@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly whatsappService: WhatsAppService
  ) {}

  @Get('qrcode')
  async getQRCode(@Res() res: Response) {
    try {
      const qrPath = await this.whatsappService.getQRCode();
      res.sendFile(qrPath);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      res.status(HttpStatus.NOT_FOUND).send('QR Code not available yet.');
    }
  }

  @Get("isLoggedIn")
async getIsLoggedIn(@Res() res: Response) {
  try {
    const isLoggedIn = await this.whatsappService.isWhatsAppUser("5493513479404");

    if (isLoggedIn) {
      return res.status(HttpStatus.OK).json({ isLoggedIn: true });
    } else {
      return res.status(HttpStatus.NOT_FOUND).json({ isLoggedIn: false });
    }
  } catch (error) {
    console.error('Error checking if user is logged in:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An error occurred while checking the user.' });
  }
}

  
}
