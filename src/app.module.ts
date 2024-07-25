import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapingModule } from './scraping/scraping.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ScrapingModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
