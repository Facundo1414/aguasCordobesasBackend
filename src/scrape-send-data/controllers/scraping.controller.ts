import { Controller, Post, Param, Get, Logger, Res, Query } from '@nestjs/common';
import { FileStorageService } from 'src/files/services/FileStorageService';
import { ScrapingService } from '../services/scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(
    private readonly scrapingService: ScrapingService,    
    private readonly fileStorageService: FileStorageService,
  ) {
    
  }
  private logger: Logger = new Logger(ScrapingController.name);


}
