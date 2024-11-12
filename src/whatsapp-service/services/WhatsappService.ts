import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsAppService{
  private clients: Map<string, Client> = new Map(); // Mapa para manejar múltiples clientes
  private isInitialized = new Map<string, boolean>(); // Estado de inicialización por usuario
  private qrCodes: Map<string, string> = new Map();

  constructor() {}



  async initializeWhatsApp(userId: string): Promise<Client> {
    if (this.isInitialized.get(userId)) {
      return this.clients.get(userId); // Return already initialized client
    }
  
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }), // Change clientId for multiple instances
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
  
    this.clients.set(userId, client);
    this.isInitialized.set(userId, false);
  
    return new Promise<Client>(async (resolve, reject) => { // Change Promise<void> to Promise<Client>
      client.on('qr', async (qr) => {
        console.log(`Received QR Code for user ${userId}`);
        this.qrCodes.set(userId, qr);
        await this.generateQRCodeBase64(qr); // Resolve without `then` for simpler code
      });
  
      client.on('ready', () => {
        console.log(`WhatsApp Web Client for user ${userId} is ready!`);
        this.isInitialized.set(userId, true);
        resolve(client); // Resolve with the client instance
      });
  
      client.on('auth_failure', (msg) => {
        console.error(`Authentication failure for user ${userId}`, msg);
        reject(new Error(`Authentication failure for user ${userId}`));
      });
  
      client.on('authenticated', () => {
        console.log(`Authenticated successfully for user ${userId}`);
      });
  
      client.on('disconnected', async (reason) => {
        console.log(`WhatsApp Web Client for user ${userId} disconnected: ${reason}`);
        this.isInitialized.set(userId, false);
        await client.destroy();
        await this.initializeWhatsApp(userId);
      });
  
      try {
        await client.initialize();
      } catch (error) {
        console.error(`Initialization error for user ${userId}:`, error);
        reject(error);
      }
    });
  }
  
  private async generateQRCode(qr: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const qrDir = path.dirname(filePath);
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }

      QRCode.toFile(filePath, qr, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async generateQRCodeBase64(qr: string): Promise<string> {
    return QRCode.toDataURL(qr); // Convertir a base64
  }

  async getQRCode(userId: string): Promise<string> {
    const qr = this.qrCodes.get(userId);
    if (qr) {
      return await this.generateQRCodeBase64(qr);
    } else {
      throw new Error('QR code not available.');
    }
  }
  

  async isWhatsAppUser(phoneNumber: string, userId: string): Promise<boolean> {
    try {
      if (phoneNumber === "" || phoneNumber === null || !phoneNumber.startsWith("549351")) {
        return false;
      }
      const chatId = `${phoneNumber}@c.us`;
      const client = this.clients.get(userId); // Obtiene el cliente sin inicializarlo
      if (!client || !this.isInitialized.get(userId)) {
        throw new Error(`Client not initialized for user ${userId}`);
      }
      return await client.isRegisteredUser(chatId);;
    } catch (error) {
      console.error('Error checking if user is registered:', error);
      return false;
    }
  }

  async sendMessage(phoneNumber: string, message: string, userId: string): Promise<void> {
    try {
      const chatId = `${phoneNumber}@c.us`;
      const client = await this.initializeWhatsApp(userId); // Asegurarse de que el cliente esté inicializado
      await client.sendMessage(chatId, message);
      console.log(`Message sent to ${phoneNumber} by user ${userId}`);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async sendPDF(phoneNumber: string, clientName: string, filePath: string, message: string, userId: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
      }

      const chatId = `${phoneNumber}@c.us`;
      const client = await this.initializeWhatsApp(userId); // Asegurarse de que el cliente esté inicializado
      const media = MessageMedia.fromFilePath(filePath);
      const caption = message || `Hola ${clientName}, te envío el PDF actualizado. Por favor, no dejes que venza. Puedes realizar el abono en cualquier Rapipago, Pago Fácil o a través de Mercado Pago.

    🌐 Cclip 
    🔹 Al servicio de Aguas Cordobesas.`;
      await client.sendMessage(chatId, media, { caption });
      console.log(`PDF sent to ${phoneNumber} by user ${userId}`);
    } catch (error) {
      console.error('Error sending PDF:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  async sendMessageWithRetry(phoneNumber: string, message: string, userId: string, retries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.sendMessage(phoneNumber, message, userId);
        return; // Exit if successful
      } catch (error) {
        console.error(`Attempt ${attempt} failed for user ${userId}:`, error);
        if (attempt === retries) {
          throw new Error(`Failed to send message after ${retries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
      }
    }
  }


  async isSessionActive(userId: string): Promise<boolean> {
    const client = this.clients.get(userId);
    return !!(client && client.info);
  }
}
