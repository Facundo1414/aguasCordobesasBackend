import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as fs from 'fs';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;

  constructor(
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue
  ) {
    this.client = new Client({
      authStrategy: new LocalAuth(),
    });
  }

  onModuleInit() {
    this.initializeWhatsApp();
  }

  initializeWhatsApp() {
    this.client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('WhatsApp Web Client is ready!');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Authentication failure', msg);
    });

    this.client.on('authenticated', () => {
      console.log('Authenticated successfully');
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp Web Client was logged out', reason);
      this.client.initialize();
    });

    this.client.initialize();
  }

  async isWhatsAppUser(phoneNumber: string): Promise<boolean> {
    try {
      if (phoneNumber === "" || phoneNumber === null || !phoneNumber.startsWith("549351")) {
        return false;
      }
      const chatId = `${phoneNumber}@c.us`;
      const isRegistered = await this.client.isRegisteredUser(chatId);
      return isRegistered;
    } catch (error) {
      console.error('Error checking if user is registered:', error);
      return false;
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const chatId = `${phoneNumber}@c.us`;
      await this.client.sendMessage(chatId, message);
      console.log(`Message sent to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async sendPDF(phoneNumber: string, clientName: string, filePath: string): Promise<void> {
    try {
        // Verificar si el archivo existe
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return;
        }

        const chatId = `${phoneNumber}@c.us`;
        const media = MessageMedia.fromFilePath(filePath);
        const message = `Hola ${clientName}, aquí está el PDF que solicitaste.`;
        await this.client.sendMessage(chatId, message);
        await this.client.sendMessage(chatId, media);
        console.log(`PDF sent to ${phoneNumber}`);
    } catch (error) {
        console.error('Error sending PDF:', error);
    }
}


  async sendMessageWithRetry(phoneNumber: string, message: string, retries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.sendMessage(phoneNumber, message);
        return; // Exit if successful
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === retries) {
          throw new Error(`Failed to send message after ${retries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
      }
    }
  }
  

  async addToQueue(phoneNumber: string, clientName: string, filePath: string): Promise<void> {
    await this.whatsappQueue.add({ phoneNumber, clientName, filePath }, {
      attempts: 3,       // Retry up to 3 times
      priority: 2,       // Set job priority
      delay: 5000,       // Delay the job by 5 seconds
      removeOnComplete: true, // Remove the job from the queue once completed
    });
  }
  
}
