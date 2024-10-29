import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapingModule } from './scrape-send-data/scraping/scraping.module';
import { FileUploadService } from './files/FileUploadService';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { WhatsAppService } from './whatsapp-service/WhatsappService';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './DB/FileService';
import { File } from './DB/File.entity';
import { FileStorageService } from './DB/FileStorageService';
import { BullModule } from '@nestjs/bull';
import { QueuesModule } from './scrape-send-data/scraping/utils/queues.module';
import { ScrapingController } from './scrape-send-data/scraping/scraping.controller';
import { ScrapingService } from './scrape-send-data/scraping/scraping.service';
import { WhatsAppProcessor } from './scrape-send-data/WhatsAppProcessor';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ProcessGateway } from './scrape-send-data/utils/process.gateway';
import { FileUploadController } from './files/FileUploadController';
import { FilterNumService } from './files/filter-file-service/FilterNumService';
import { FilterFileService } from './files/filter-file-service/FilterFileService';
import { CleanupService } from './DB/utils/CleanupService';
import { ScrapingProcessor } from './scrape-send-data/ScrapingProcessor';
import { ProcessController } from './scrape-send-data/process/process.controller';
import { AuthController } from './users/auth/auth.controller';
import { AuthService } from './users/auth/auth.service';
import { UserService } from './users/users.service';
import { AuthModule } from './users/auth/auth.module';
import { UsersModule } from './users/users.module';
import { FileProcessingService } from './scrape-send-data/process/file-processing.service';
import { ErrorHandlerService } from './scrape-send-data/process/error-handler.service';
import { User } from './users/user.entity';


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
      entities: [File, User],
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

    HttpModule,

    ScheduleModule.forRoot(),

    AuthModule,

    UsersModule,

  ], 


  controllers: [
    AppController, 
    FileUploadController,
    ProcessController,
    ScrapingController,
    AuthController,
  ],


  providers: [
    AppService,
    FileUploadService,
    FilterNumService,
    FilterFileService, 
    WhatsAppService, 
    FileService, 
    FileStorageService,
    CleanupService,
    ScrapingProcessor,
    WhatsAppProcessor,
    ScrapingService,
    ProcessGateway,
    AuthService,
    FileProcessingService,
    ErrorHandlerService,
    UserService,
  ],


  exports: [
    FilterNumService,
    FileStorageService,
    UserService,
  ],
  
})
export class AppModule {}
