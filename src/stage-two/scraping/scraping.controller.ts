import { Controller, Get, Query } from '@nestjs/common';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Get()
  async getScrapingData(@Query('UFnumber') UFnumber: string): Promise<string> {
    return await this.scrapingService.scrape(UFnumber);
  }
}
