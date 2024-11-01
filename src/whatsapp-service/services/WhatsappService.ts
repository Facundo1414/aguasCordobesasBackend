import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsAppService{
  private clients: Map<string, Client> = new Map(); // Mapa para manejar múltiples clientes
  private isInitialized = new Map<string, boolean>(); // Estado de inicialización por usuario

  constructor() {}



  private async initializeWhatsApp(userId: string): Promise<Client> {
    if (this.isInitialized.get(userId)) {
      return this.clients.get(userId); // Devuelve el cliente ya inicializado
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }), // Cambia el clientId para permitir múltiples instancias
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.clients.set(userId, client);
    this.isInitialized.set(userId, false);

    return new Promise<void>(async (resolve, reject) => {
      client.on('qr', (qr) => {
        console.log(`Received QR Code for user ${userId}:`, qr);
        const qrPath = path.join(__dirname, '..', 'qr', `${userId}_qrcode.png`);
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

      client.on('ready', () => {
        console.log(`WhatsApp Web Client for user ${userId} is ready!`);
        this.isInitialized.set(userId, true);
        resolve(); // Resuelve la promesa aquí
      });

      client.on('auth_failure', (msg) => {
        console.error(`Authentication failure for user ${userId}`, msg);
      });

      client.on('authenticated', () => {
        console.log(`Authenticated successfully for user ${userId}`);
      });

      client.on('disconnected', (reason) => {
        console.log(`WhatsApp Web Client for user ${userId} was logged out`, reason);
        client.initialize();
      });

      try {
        await client.initialize(); // Inicializa el cliente
      } catch (error) {
        console.error(`Initialization error for user ${userId}:`, error);
        reject(error);
      }
    }).then(() => client); // Devuelve el cliente al finalizar
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

  async getQRCode(userId: string): Promise<string> {
    console.log(`Getting QR code for user ${userId}`);

    await this.initializeWhatsApp(userId);

    const qrPath = path.join(__dirname, '..', 'qr', `${userId}_qrcode.png`);

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

  async isWhatsAppUser(phoneNumber: string, userId: string): Promise<boolean> {
    try {
      if (phoneNumber === "" || phoneNumber === null || !phoneNumber.startsWith("549351")) {
        return false;
      }
      const chatId = `${phoneNumber}@c.us`;
      const client = await this.initializeWhatsApp(userId); // Asegurarse de que el cliente esté inicializado
      const isRegistered = await client.isRegisteredUser(chatId);
      return isRegistered;
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
}
