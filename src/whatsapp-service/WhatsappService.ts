import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;

  constructor() {
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


}
