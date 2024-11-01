import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises'; // Uso de Promises para operaciones asincrónicas
import * as path from 'path';
import { Cron } from '@nestjs/schedule';
import { FileStorageService } from '../../files/services/FileStorageService';

@Injectable()
export class CleanupService {
  constructor(private readonly fileStorageService: FileStorageService) {}

  private tempDir = path.join(__dirname, '../uploads/tmp');

  // Método para limpiar archivos temporales invocado manualmente o por cron
  async cleanTemporaryFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir); // Leer archivos en el directorio
      const now = new Date().getTime();

      await Promise.all(files.map(async (file) => {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath); // Obtener estadísticas del archivo
        const endTime = new Date(stats.mtime).getTime() + 24 * 60 * 60 * 1000; // 24 horas

        if (now > endTime) {
          await fs.unlink(filePath); // Eliminar archivo
          console.log(`Archivo temporal ${file} eliminado`);
        }
      }));
    } catch (error) {
      console.error('Error al limpiar archivos temporales:', error);
    }
  }

  // Método que se ejecuta automáticamente cada medianoche
  @Cron('0 0 * * *') // Configuración para ejecutar cada medianoche
  handleCron() {
    this.cleanTemporaryFiles();
  }
}
