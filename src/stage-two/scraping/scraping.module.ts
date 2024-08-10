import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { BullModule } from '@nestjs/bull';
import { QueuesModule } from './queues.module';

@Module({
  imports: [
    QueuesModule,
    HttpModule, // Add HttpModule here
  ],  
  providers: [ScrapingService],
  controllers: [ScrapingController],
  exports: [ScrapingService], // Export ScrapingService if needed by other modules
})
export class ScrapingModule {}
