// interfaces/WhatsAppProvider.interface.ts
export interface WhatsAppProvider {
  initialize(userId: string): Promise<void>;
  getQRCode(userId: string): Promise<string>;
  isWhatsAppUser(phoneNumber: string, userId: string): Promise<boolean>;
  sendMessage(phoneNumber: string, message: string, userId: string): Promise<void>;
  sendPDF(phoneNumber: string, clientName: string, filePath: string, message: string, userId: string): Promise<void>;
  isSessionActive(userId: string): Promise<boolean>; 
  isClientReady(userId: string): Promise<boolean>
  closeSession(userId: string): Promise<void>;
}
