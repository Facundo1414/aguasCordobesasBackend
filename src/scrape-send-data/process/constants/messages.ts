// constants/messages.ts
export const Messages = {
    FILE_PROCESSED: 'Proceso completado con éxito, no se encontraron clientes sin deuda.',
    ERROR_PROCESSING: 'Ocurrió un error durante el procesamiento.',
    PDF_NOT_AVAILABLE: (clientName: string, clientUF: string) =>
      `No hay PDF disponible para ${clientName} (UF: ${clientUF}). Posiblemente no hay deuda.`,
    INCOMPLETE_DATA: (clientName: string, clientUF: string) =>
      `Datos incompletos para ${clientName} (UF: ${clientUF})`,
  };
  