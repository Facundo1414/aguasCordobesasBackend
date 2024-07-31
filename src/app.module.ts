import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapingModule } from './scraping/scraping.module';
import { HealthController } from './health/health.controller';
import { FileUploadController } from './file-upload/FileUploadController';
import { FileUploadService } from './file-upload/FileUploadService';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { FilterNumService } from './filter-service/FilterNumService';
import { FilterPlanService } from './filter-service/FilterPlanService';
import { FilterFileService } from './filter-service/FilterFileService';
import { WhatsAppService } from './whatsapp-service/WhatsappService';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file-upload/DB/FileService';
import { File } from './file-upload/DB/File.entity';

@Module({
  imports: [
    ScrapingModule,

    MulterModule.register({
      dest: './uploads', // Directorio donde se guardarán los archivos
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'root',
      database: 'aquaDB',
      entities: [File],
      synchronize: true, // TODO Asegúrate de ponerlo en `false` en producción
    }),
    TypeOrmModule.forFeature([File]),

  ], 
  controllers: [AppController, HealthController,FileUploadController],
  providers: [AppService,FileUploadService,FilterNumService, FilterPlanService, FilterFileService, WhatsAppService, FileService],
  exports: [FilterNumService],
})
export class AppModule {}
