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

    // Create temp directory if it doesn't exist
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

  getTempDir(): string {
    return this.tempDir;
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
