import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ScrapingService } from './scraping/scraping.service';

@Processor('scraping')
export class ScrapingProcessor {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Process({ concurrency: 5 })  // Configuración de la concurrencia
  async handleScraping(job: Job) {
    const { searchValue } = job.data;
    await this.scrapingService.scrape(searchValue);
  }
}
