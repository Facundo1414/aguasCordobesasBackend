import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileStorageService implements OnModuleDestroy {
  private readonly client: Client;
  private readonly tempDir = path.join(__dirname, '..', '..', 'temp');

  constructor() {
    this.client = new Client({
      user: 'postgres',
      host: 'localhost',
      database: 'aquaDB',
      password: 'root',
      port: 5432,
    });

    this.client.connect();

    // Crear el directorio temporal si no existe
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir);
    }
  }

  async saveTempFile(file: Express.Multer.File): Promise<string> {
    const tempFilePath = path.join(this.tempDir, file.filename);
    fs.writeFileSync(tempFilePath, file.buffer);
    return tempFilePath;
  }

  async deleteTempFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async cleanTempDir(): Promise<void> {
    const files = fs.readdirSync(this.tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(this.tempDir, file));
    }
  }

  async saveFile(filePath: string, fileType: string, userId: number): Promise<void> {
    try {
      const fileData = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      const insertQuery = `
        INSERT INTO file_storage (file_name, file_type, data, user_id) 
        VALUES ($1, $2, $3, $4)
      `;

      await this.client.query(insertQuery, [
        fileName,
        fileType,
        fileData,
        userId,
      ]);
    } catch (error) {
      console.error('Error saving file to database:', error);
    }
  }

  async getFile(fileName: string): Promise<string> {
    try {
      const query = 'SELECT file_name, data FROM file_storage WHERE file_name = $1';
      console.log(`Querying for file: ${fileName}`);
      const result = await this.client.query(query, [fileName]);
  
      if (result.rows.length === 0) {
        console.error(`File with name "${fileName}" not found in database.`);
        throw new Error('File not found');
      }
  
      const { file_name, data } = result.rows[0];
      const tempFilePath = path.join(this.tempDir, file_name);
  
      try {
        fs.writeFileSync(tempFilePath, data);
        console.log(`File written to temporary directory: ${tempFilePath}`);
      } catch (writeError) {
        console.error(`Error writing file to temporary directory: ${writeError.message}`);
        throw writeError;
      }
  
      return tempFilePath;
    } catch (error) {
      console.error('Error retrieving file from database:', error);
      throw error;
    }
  }
  

  async getFilePath(fileName: string): Promise<string> {
    try {
      // Busca el archivo en la base de datos y lo guarda en el directorio temporal
      const tempFilePath = await this.getFile(fileName);
      return tempFilePath;
    } catch (error) {
      console.error('Error getting file path:', error);
      throw error;
    }
  }

  getTempDir(): string {
    return this.tempDir;
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
