import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;
  private isInitialized = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
  }

  onModuleInit() {
    this.initializeWhatsApp().catch((error) => {
      console.error('Error during WhatsApp initialization:', error);
    });
  }

  private async initializeWhatsApp(): Promise<void> {
    if (this.isInitialized) return;
  
    return new Promise<void>(async (resolve, reject) => {
      this.client.on('qr', (qr) => {
        console.log('Received QR Code:', qr);
        const qrPath = path.join(__dirname, '..', 'qr', 'qrcode.png');
        this.generateQRCode(qr, qrPath)
          .then(() => {
            console.log('QR code saved to:', qrPath);
            resolve();
          })
          .catch((err) => {
            console.error('Error saving QR code:', err);
            reject(err);
          });
      });
  
      this.client.on('ready', () => {
        console.log('WhatsApp Web Client is ready!');
        this.isInitialized = true;
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
  
      try {
        await this.client.initialize();
      } catch (error) {
        console.error('Initialization error:', error);
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
  
  async getQRCode(): Promise<string> {
    this.isInitialized = true;
    console.log("get qr process started");
    
    await this.initializeWhatsApp();
  
    const qrPath = path.join(__dirname, '..', 'qr', 'qrcode.png');
  
    // Esperar hasta que el archivo QR esté disponible
    const checkInterval = 500; // Intervalo en ms para verificar la existencia del archivo
    const maxRetries = 20; // Número máximo de intentos de verificación
    let retries = 0;
  
    while (!fs.existsSync(qrPath) && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      retries++;
    }
  
    if (fs.existsSync(qrPath)) {
      return qrPath;
    } else {
      throw new Error('QR Code not available yet.');
    }
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

  async sendPDF(phoneNumber: string, clientName: string, filePath: string, message: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
      }

      const chatId = `${phoneNumber}@c.us`;
      const media = MessageMedia.fromFilePath(filePath);
      const caption = message || `Hola ${clientName}, te envío el PDF actualizado. Por favor, no dejes que venza. Puedes realizar el abono en cualquier Rapipago, Pago Fácil o a través de Mercado Pago.

    🌐 Cclip 
    🔹 Al servicio de Aguas Cordobesas.`;
      await this.client.sendMessage(chatId, media, { caption });
      console.log(`PDF sent to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending PDF:', error.message);
      console.error('Stack trace:', error.stack);
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
}
