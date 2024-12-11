import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppSessionEntity } from './whatsappSession.entity';
import { WhatsAppPostgresStore } from '../services/whatsappStore';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsAppSessionEntity]), // Registra la entidad
  ],
  providers: [WhatsAppPostgresStore], // Define los servicios
  exports: [WhatsAppPostgresStore], // Exporta el servicio para usarlo en otros módulos
})
export class WhatsAppModule {}
