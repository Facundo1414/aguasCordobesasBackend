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


}
