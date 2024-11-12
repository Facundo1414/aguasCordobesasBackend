// providers/VenomProvider.ts
import { create, Whatsapp } from 'venom-bot';
import { WhatsAppProvider } from '../models/WhatsAppProvider.interface';

export class VenomProvider implements WhatsAppProvider {

  private clients: Map<string, { client: Whatsapp; qrCode: string | null }> = new Map();

  async initialize(userId: string): Promise<void> {
    if (!this.clients.has(userId)) {
      try {
        const client = await create(userId, (base64Qr, asciiQR) => {
          console.log(`QR for user ${userId}:`, asciiQR);
          // Guardar el QR en base64 para su posterior recuperación
          this.clients.set(userId, { client, qrCode: base64Qr });
        });
        this.clients.set(userId, { client, qrCode: null }); // Almacenar el cliente en el mapa
      } catch (error) {
        throw new Error(`Error initializing Venom client for user ${userId}: ${error.message}`);
      }
    }
  }

  async getQRCode(userId: string): Promise<string> {
    const clientData = this.clients.get(userId);
    if (!clientData) throw new Error(`Client not initialized for user ${userId}`);
    if (!clientData.qrCode) throw new Error(`QR code not available for user ${userId}`);
    
    return clientData.qrCode; // Retorna el código QR en base64
  }

  async isWhatsAppUser(phoneNumber: string, userId: string): Promise<boolean> {
    const clientData = this.clients.get(userId);
    if (!clientData) throw new Error(`Client not initialized for user ${userId}`);
    try {
      const { status } = await clientData.client.checkNumberStatus(`${phoneNumber}@c.us`);
      return status === 200;
    } catch (error) {
      throw new Error(`Error checking if number is WhatsApp user for ${phoneNumber}: ${error.message}`);
    }
  }

  async sendMessage(phoneNumber: string, message: string, userId: string): Promise<void> {
    const clientData = this.clients.get(userId);
    if (!clientData) throw new Error(`Client not initialized for user ${userId}`);
    try {
      await clientData.client.sendText(`${phoneNumber}@c.us`, message);
    } catch (error) {
      throw new Error(`Error sending message to ${phoneNumber}: ${error.message}`);
    }
  }

  async sendPDF(phoneNumber: string, clientName: string, filePath: string, message: string, userId: string): Promise<void> {
    const clientData = this.clients.get(userId);
    if (!clientData) throw new Error(`Client not initialized for user ${userId}`);
    try {
      await clientData.client.sendFile(`${phoneNumber}@c.us`, filePath, `${clientName}.pdf`, message);
    } catch (error) {
      throw new Error(`Error sending PDF to ${phoneNumber}: ${error.message}`);
    }
  }

  async isSessionActive(userId: string): Promise<boolean> {
    const clientData = this.clients.get(userId);
    return clientData !== undefined; // Retorna true si la sesión está activa, de lo contrario, false
  }

  async isClientReady(userId: string): Promise<boolean>{
    console.log("isClientReady(): Not implemented yet");
    return false;
  }

  async closeSession(userId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
