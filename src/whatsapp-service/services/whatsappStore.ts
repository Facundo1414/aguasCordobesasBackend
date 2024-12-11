import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from 'whatsapp-web.js';
import { WhatsAppSessionEntity } from '../models/whatsappSession.entity';

@Injectable()
export class WhatsAppPostgresStore implements Store {
  constructor(
    @InjectRepository(WhatsAppSessionEntity)
    private readonly sessionRepository: Repository<WhatsAppSessionEntity>,
  ) {}

  async sessionExists(options: { session: string }): Promise<boolean> {
    const session = await this.sessionRepository.findOne({ where: { user_id: options.session } });
    return !!session;
  }

  async delete(options: { session: string }): Promise<any> {
    await this.sessionRepository.delete({ user_id: options.session });
  }

  async save(options: { session: string, data: any }): Promise<any> {
    const { session, data } = options;
    const sessionRecord = await this.sessionRepository.findOne({ where: { user_id: session } });
    const serializedData = data || {}; // Asignar un objeto vacío si `data` es nulo o undefined
  
    if (sessionRecord) {
      sessionRecord.session_data = serializedData;
      await this.sessionRepository.save(sessionRecord);
    } else {
      await this.sessionRepository.insert({
        user_id: session,
        session_data: serializedData,  // Asegurarse de que `session_data` no sea nulo
      });
    }
  }
  
  

  async extract(options: { session: string, path: string }): Promise<any> {
    const sessionRecord = await this.sessionRepository.findOne({ where: { user_id: options.session } });
    if (!sessionRecord) {
      return null;
    }

    // Opcional: Aquí podrías manejar el parámetro `path` si es relevante para tu caso.
    return sessionRecord.session_data;
  }
}
