import { Module } from '@nestjs/common';
import { ScrapingModule } from './scrape-send-data/models/scraping.module';
import { FileUploadService } from './files/services/FileUploadService';
import { MulterModule } from '@nestjs/platform-express';
import { WhatsAppService } from './whatsapp-service/services/WhatsappService';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileStorageService } from './files/services/FileStorageService';
import { BullModule } from '@nestjs/bull';
import { QueuesModule } from './scrape-send-data/utils/queues.module';
import { ScrapingController } from './scrape-send-data/controllers/scraping.controller';
import { ScrapingService } from './scrape-send-data/services/scraping.service';
import { WhatsAppProcessor } from './scrape-send-data/services/WhatsAppProcessor';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ProcessGateway } from './scrape-send-data/utils/process.gateway';
import { FileUploadController } from './files/controllers/FileUploadController';
import { ProcessController } from './scrape-send-data/controllers/process.controller';
import { UserService } from './users/services/users.service';
import { AuthModule } from './users/models/auth.module';
import { UsersModule } from './users/models/users.module';
import { FileProcessingService } from './scrape-send-data/services/file-processing.service';
import { ErrorHandlerService } from './scrape-send-data/services/error-handler.service';
import { JwtStrategy } from './users/jwt/jwt.strategy';
import { RefreshToken } from './users/jwt/refresh-token.entity';
import { User } from './users/models/user.entity';
import { AuthController } from './users/controller/auth.controller';
import { FilterNumService } from './files/services/FilterNumService';
import { FilterFileService } from './files/services/FilterFileService';
import { FileService } from './files/services/FileService';
import { ScrapingProcessor } from './scrape-send-data/services/ScrapingProcessor';
import { AuthService } from './users/services/auth.service';
import { CleanupService } from './files/services/CleanupService';
import { JwtModule } from '@nestjs/jwt';
import { WhatsAppController } from './whatsapp-service/controller/WhatsAppController';
import { FileUpload } from './files/models/File.entity';
import { WhatsAppSessionEntity } from './whatsapp-service/models/whatsappSession.entity';
import { WhatsAppPostgresStore } from './whatsapp-service/services/whatsappStore';
import { WhatsAppModule } from './whatsapp-service/models/whatsapp.module';


@Module({
  imports: [
    ScrapingModule, 

    QueuesModule, 

    JwtModule.registerAsync({ 
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '60m' },
      }),
    }),

    MulterModule.register({ 
      dest: './uploads', // Directorio donde se guardarán los archivos
    }),

    TypeOrmModule.forRoot({ 
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: "postgres",
      password: "root",
      database: "aquaDB",
      entities: [FileUpload, User, RefreshToken, WhatsAppSessionEntity],
      synchronize: true, // TODO Asegúrate de ponerlo en `false` en producción
    }),
    TypeOrmModule.forFeature([FileUpload, User, RefreshToken, WhatsAppSessionEntity]), 

    BullModule.forRoot({ 
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),

    HttpModule, 

    ScheduleModule.forRoot(), 

    AuthModule, 

    UsersModule, 

    WhatsAppModule
  ], 


  controllers: [
    FileUploadController,
    ProcessController,
    ScrapingController,
    AuthController,
    WhatsAppController
  ],


  providers: [
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
    FileProcessingService,
    ErrorHandlerService,
    JwtStrategy, 
    AuthService,
    UserService,
  ],


  exports: [
    FilterNumService,
    FileStorageService,
    UserService,
  ],
  
})
export class AppModule {}
