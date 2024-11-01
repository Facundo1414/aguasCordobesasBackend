import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { ScrapingService } from '../services/scraping.service';
import { ScrapingController } from '../controllers/scraping.controller';
import { BullModule } from '@nestjs/bull';
import { QueuesModule } from '../utils/queues.module';
import { FileStorageService } from 'src/files/services/FileStorageService';

@Module({
  imports: [
    QueuesModule,
    HttpModule, // Add HttpModule here
  ],  
  providers: [ScrapingService,FileStorageService],
  controllers: [ScrapingController],
  exports: [ScrapingService], // Export ScrapingService if needed by other modules
})
export class ScrapingModule {}
