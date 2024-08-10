// scraping.module.ts
import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { BullModule } from '@nestjs/bull';
import { QueuesModule } from './queues.module';

@Module({
  imports: [QueuesModule],  
  providers: [ScrapingService],
  controllers: [ScrapingController],
})
export class ScrapingModule {}
