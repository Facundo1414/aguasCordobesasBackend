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



  async initializeWhatsApp(userId: string): Promise<{ client: Client, qrCode?: string }> {
    if (this.isInitialized.get(userId)) {
      return { client: this.clients.get(userId) };
    }
  
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });
  
    this.clients.set(userId, client);
    this.isInitialized.set(userId, false);
  
    return new Promise((resolve, reject) => {
      client.on('qr', async (qr) => {
        console.log(`QR generado para usuario ${userId}`);
        const qrCodeBase64 = await QRCode.toDataURL(qr);
        // Solo enviamos el código QR si aún no está listo
        if (!this.isInitialized.get(userId)) {
          resolve({ client, qrCode: qrCodeBase64 });
        }
      });
  
      client.on('ready', () => {
        console.log(`Cliente de WhatsApp para usuario ${userId} listo`);
        this.isInitialized.set(userId, true);
        resolve({ client }); // Resolución cuando está listo
      });
  
      client.on('auth_failure', (msg) => {
        console.error(`Fallo de autenticación para usuario ${userId}`, msg);
        reject(new Error(`Fallo de autenticación para usuario ${userId}`));
      });
  
      client.on('disconnected', async (reason) => {
        console.log(`Cliente de WhatsApp para usuario ${userId} desconectado: ${reason}`);
        this.isInitialized.set(userId, false);
        await client.destroy();
        await this.initializeWhatsApp(userId);
      });
  
      try {
        client.initialize();
      } catch (error) {
        console.error(`Error al inicializar para usuario ${userId}:`, error);
        reject(error);
      }
    });
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
      return await client.isRegisteredUser(chatId);
    } catch (error) {
      console.error('Error checking if user is registered:', error);
      return false;
    }
  }

  async sendMessage(phoneNumber: string, message: string, userId: string): Promise<void> {
    try {
      const chatId = `${phoneNumber}@c.us`;
      const client = this.clients.get(userId); // Obtiene el cliente sin inicializarlo
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

      const client = this.clients.get(userId);
      if (!client || !this.isInitialized.get(userId)) {
        console.error(`Client is not initialized for user ${userId}`);
        return;
      }

      const chatId = `${phoneNumber}@c.us`;
      const media = MessageMedia.fromFilePath(filePath);
      const caption = message || `Hola ${clientName}, te envío el PDF actualizado de la CUOTA PLAN DE PAGOS. Por favor, no dejes que venza. Puedes realizar el abono en cualquier Rapipago, Pago Fácil o a través de Mercado Pago.

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

  async checkSessionStatus(userId: string): Promise<boolean> {
    const client = this.clients.get(userId);
    return client ? client.info !== null : false;
  }
  


  async logout(userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (client) {
      //await client.logout(); // Cierra la sesión de WhatsApp
      await client.destroy(); // Destruye el cliente
      this.clients.delete(userId); // Elimina el cliente del mapa
      this.isInitialized.delete(userId); // Elimina el estado de inicialización
      console.log(`User ${userId} has logged out and client destroyed`);
    } else {
      console.warn(`No active client found for user ${userId}`);
    }
  }
  
  
}

