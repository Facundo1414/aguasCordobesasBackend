// providers/WhatsAppWebJsProvider.ts
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { WhatsAppProvider } from '../models/WhatsAppProvider.interface';
import { WhatsAppService } from '../services/WhatsappService';
import { Inject } from '@nestjs/common';

export class WhatsAppWebJsProvider implements WhatsAppProvider {
  private clients: Map<string, Client> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private clientReady: Map<string, boolean> = new Map(); // Agregar un mapa para saber si el cliente está listo


  async initialize(userId: string): Promise<void> {
    if (!this.clients.has(userId)) {
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: userId }),
        puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
      });
  
      this.clients.set(userId, client);
      this.clientReady.set(userId, false);
  
      await new Promise<void>((resolve, reject) => {
        client.on('qr', async (qr) => {
          const qrCode = await QRCode.toDataURL(qr);
          this.qrCodes.set(userId, qrCode);
        });
  
        client.on('ready', () => {
          console.log(`WhatsApp Web Client for user ${userId} is ready!`);
          this.clientReady.set(userId, true);
          resolve();
        });
  
        client.on('auth_failure', (msg) => {
          console.error(`Authentication failed for user ${userId}: ${msg}`);
          reject(new Error(`Authentication failed for user ${userId}`));
        });
  
        client.on('disconnected', () => {
          console.log(`WhatsApp Web Client for user ${userId} disconnected`);
          this.qrCodes.delete(userId);
          this.clients.delete(userId);
        });
  
        client.on('error', (error) => {
          console.error(`Unexpected error for user ${userId}:`, error);
        });
  
        client.initialize().catch((err) => reject(err));
      });
    }
  }
  



  async isClientReady(userId: string): Promise<boolean> {
    return this.clientReady.get(userId) || false;
  }

  async getQRCode(userId: string): Promise<string> {
    if (!this.qrCodes.has(userId)) {
      throw new Error(`QR Code not available for user ${userId}. Please initialize the client first.`);
    }
    
    // Espera hasta que el QR esté disponible
    while (!this.qrCodes.get(userId)) {
      await new Promise(resolve => setTimeout(resolve, 1000));  // Espera 1 segundo
    }
    
    return this.qrCodes.get(userId);
  }
  

  async sendQRCodeImage(phoneNumber: string, userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (!client) throw new Error(`Client not initialized for user ${userId}`);
    
    const qrBase64 = await this.getQRCode(userId);
    const qrMedia = new MessageMedia('image/png', qrBase64.replace(/^data:image\/png;base64,/, ''));

    await client.sendMessage(`${phoneNumber}@c.us`, qrMedia);
  }


  async isWhatsAppUser(phoneNumber: string, userId: string): Promise<boolean> {
    const client = this.clients.get(userId);
    if (!client) throw new Error(`Client not initialized for user ${userId}`);
    return client.isRegisteredUser(`${phoneNumber}@c.us`);
  }

  async sendMessage(phoneNumber: string, message: string, userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (!client) throw new Error(`Client not initialized for user ${userId}`);
    await client.sendMessage(`${phoneNumber}@c.us`, message);
  }

  async sendPDF(phoneNumber: string, clientName: string, filePath: string, message: string, userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (!client) throw new Error(`Client not initialized for user ${userId}`);
    const media = MessageMedia.fromFilePath(filePath);
    await client.sendMessage(`${phoneNumber}@c.us`, media, { caption: message });
  }


  async isSessionActive(userId: string): Promise<boolean> {
    const client = this.clients.get(userId);
    return !!(client && client.info);
  }
  

  async closeSession(userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (client) {
      await client.logout();
      this.clients.delete(userId);
      console.log(`Session for user ${userId} closed`);
    } else {
      throw new Error(`Client not initialized for user ${userId}`);
    }
  }

}
 