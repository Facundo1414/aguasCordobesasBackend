import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia, RemoteAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { WhatsAppPostgresStore } from './whatsappStore';

@Injectable()
export class WhatsAppService{
  private clients: Map<string, Client> = new Map(); // Mapa para manejar múltiples clientes
  private isInitialized = new Map<string, boolean>(); // Estado de inicialización por usuario
  private qrCodes = new Map<string, string>(); // Almacena los códigos QR por usuario

  constructor(private readonly sessionStore: WhatsAppPostgresStore) {}

  async initializeWhatsApp(userId: string): Promise<{ client: Client; qrCode?: string }> {
    if (this.isInitialized.get(userId)) {
      const existingClient = this.clients.get(userId);
      if (existingClient && existingClient.info) {
        return { client: existingClient }; // La sesión ya está activa, no necesitamos el QR
      }
    }

    // Verificar si la sesión existe en la base de datos
    //const sessionData = await this.sessionStore.extract({ session: userId, path: '' });\]
    

    // Usamos RemoteAuth para manejar la sesión almacenada en la base de datos
    const client = new Client({
      authStrategy: new RemoteAuth({
        clientId: userId, // Asegúrate de que el `clientId` sea único por usuario
        store: this.sessionStore, // Usamos el store que apunta a la base de datos
        backupSyncIntervalMs: 90000, // Sincronización en intervalos
      }),
      puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });

    this.clients.set(userId, client);
    this.isInitialized.set(userId, false);

    return new Promise((resolve, reject) => {
      let qrResolved = false;

      client.on('qr', async (qr) => {
        const qrCodeBase64 = await QRCode.toDataURL(qr);
        this.qrCodes.set(userId, qrCodeBase64);
        if (!qrResolved) {
          qrResolved = true;
          resolve({ client, qrCode: qrCodeBase64 });
        }
      });

      client.on('ready', async () => {
        this.isInitialized.set(userId, true);
        this.qrCodes.delete(userId);
        resolve({ client });
      });

      client.on('auth_failure', (msg) => {
        this.cleanUpUser(userId);
        reject(new Error(`Auth failure for user ${userId}: ${msg}`));
      });

      client.on('disconnected', async (reason) => {
        this.cleanUpUser(userId);
        setTimeout(() => this.initializeWhatsApp(userId), 5000);
      });

      client.initialize();
    });
}

  
  // Método adicional para limpiar el estado del usuario
  private cleanUpUser(userId: string): void {
    this.clients.delete(userId);
    this.isInitialized.delete(userId);
    this.qrCodes.delete(userId);
  }
  
  
  getQRCode(userId: string): string | null {
    return this.qrCodes.get(userId) || null; // Retorna el QR almacenado
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
      if (!client || !this.isInitialized.get(userId)) {
        throw new Error(`Client not initialized for user ${userId}`);
      }
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

      if (!phoneNumber || !phoneNumber.startsWith("549351")) {
        throw new Error('Invalid phone number format.');
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
  
  isInitializing(userId: string): boolean {
    const sesion = this.isInitialized.get(userId);
    if (sesion) {
      return true
    }
    return false}
  

  async logout(userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (client) {
      //await client.logout(); // Cierra la sesión de WhatsApp
      await client.destroy(); // Destruye el cliente
      this.clients.delete(userId); // Elimina el cliente del mapa
      this.isInitialized.delete(userId); // Elimina el estado de inicialización
      this.qrCodes.delete(userId);
      // Eliminar la sesión de la base de datos
      await this.sessionStore.delete({ session: userId });

      console.log(`User ${userId} has logged out and client destroyed`);
    } else {
      console.warn(`No active client found for user ${userId}`);
    }
  }
  
  
}

