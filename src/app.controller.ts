import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { WhatsAppService } from './whatsapp-service/WhatsappService';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly whatsappService: WhatsAppService
  ) {}


}
