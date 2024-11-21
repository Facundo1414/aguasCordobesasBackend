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
      user: process.env.DB_USER, 
      host: process.env.DB_HOST, 
      database: process.env.DB_NAME, 
      password: process.env.DB_PASSWORD, 
      port: Number(process.env.DB_PORT) || 5432, 
    });

    this.client.connect().then(() => {
      this.initializeDatabase();
    }).catch(error => {
      console.error('Error connecting to the database:', error);
    });

    // Create the temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir);
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS file_storage (
          id SERIAL PRIMARY KEY,
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(255),
          data BYTEA NOT NULL,
          user_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT FALSE
        );
      `;
      await this.client.query(createTableQuery);
    } catch (error) {
      console.error('Error initializing database:', error);
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

  async saveFile(filePath: string, fileType: string, userId: string, processed: boolean = false): Promise<void> {
    try {
      const fileData = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      const insertQuery = `
        INSERT INTO file_storage (file_name, file_type, data, user_id, processed) 
        VALUES ($1, $2, $3, $4, $5)
      `;

      await this.client.query(insertQuery, [
        fileName,
        fileType,
        fileData,
        userId,
        processed,
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

  // Método para verificar si un archivo ha sido procesado
  async isFileProcessed(fileName: string): Promise<boolean> {
    try {
      const query = 'SELECT processed FROM file_storage WHERE file_name = $1';
      const result = await this.client.query(query, [fileName]);

      if (result.rows.length === 0) {
        console.error(`File with name "${fileName}" not found in database.`);
        return false
      }

      const { processed } = result.rows[0];
      return processed; // Retorna true si el archivo ha sido procesado
    } catch (error) {
      console.error('Error checking file processed status:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
