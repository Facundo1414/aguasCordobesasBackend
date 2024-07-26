import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapingModule } from './scraping/scraping.module';
import { HealthController } from './health/health.controller';
import { FileUploadController } from './file-upload/FileUploadController';
import { FileUploadService } from './file-upload/FileUploadService';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [ScrapingModule, MulterModule.register({
    dest: './uploads', // Directorio donde se guardarán los archivos
  }),],
  controllers: [AppController, HealthController,FileUploadController],
  providers: [AppService,FileUploadService],
})
export class AppModule {}
