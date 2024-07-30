import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { WhatsAppService } from './whatsapp-service/WhatsappService';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly whatsappService: WhatsAppService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('send-message')
  async sendMessage(
    @Body('phoneNumber') phoneNumber: string,
    @Body('message') message: string,
  ): Promise<void> {
    await this.whatsappService.sendMessage(phoneNumber, message);
  }

  @Get('check-whatsapp')
  async checkWhatsApp(
    @Query('phoneNumber') phoneNumber: string,
  ): Promise<{ isRegistered: boolean }> {
    const isRegistered = await this.whatsappService.isWhatsAppUser(phoneNumber);
    return { isRegistered };
  }
}
