import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { WhatsAppService } from 'src/whatsapp-service/services/WhatsappService';

@Processor('whatsapp')
export class WhatsAppProcessor {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Process({ concurrency: 5 })  // Configuración de la concurrencia
  async handleSendPDF(job: Job): Promise<void> {
    const { clientId, filePath, clientName, userId } = job.data;
    await this.whatsAppService.sendPDF(clientId, filePath, clientName, "",userId);
  }
}
