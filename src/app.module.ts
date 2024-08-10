import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapingModule } from './stage-two/scraping/scraping.module';
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
import { FileStorageService } from './file-upload/DB/FileStorageService';
import { CleanupService } from './file-upload/DB/CleanupService';
import { BullModule } from '@nestjs/bull';
import { ProcessController } from './stage-two/ProcessController';
import { ScrapingProcessor } from './stage-two/ScrapingProcessor';
import { QueuesModule } from './stage-two/scraping/queues.module';
import { ScrapingController } from './stage-two/scraping/scraping.controller';
import { ScrapingService } from './stage-two/scraping/scraping.service';
import { WhatsAppProcessor } from './stage-two/WhatsAppProcessor';


@Module({
  imports: [
    ScrapingModule,

    QueuesModule,

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

    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'scraping',
      defaultJobOptions: {
        attempts: 3,  // Número de intentos si el trabajo falla
        backoff: 5000,  // Tiempo de espera entre intentos
      },
    }),
    BullModule.registerQueue({
      name: 'whatsapp',
      defaultJobOptions: {
        attempts: 3,  // Número de intentos si el trabajo falla
        backoff: 5000,  // Tiempo de espera entre intentos
      },
    }),
  ], 


  controllers: [
    AppController, 
    HealthController,
    FileUploadController,
    ProcessController,
    ScrapingController
  ],


  providers: [
    AppService,
    FileUploadService,
    FilterNumService,
    FilterPlanService, 
    FilterFileService, 
    WhatsAppService, 
    FileService, 
    FileStorageService,
    CleanupService,
    ScrapingProcessor,
    WhatsAppProcessor,
    ScrapingService
  ],


  exports: [
    FilterNumService,
    FileStorageService
  ],
  
})
export class AppModule {}
