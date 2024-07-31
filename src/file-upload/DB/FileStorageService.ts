import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileStorageService implements OnModuleDestroy {
  private readonly client: Client;

  constructor() {
    this.client = new Client({
      user: 'postgres',
      host: 'localhost',
      database: 'aquaDB',
      password: 'root',
      port: 5432,
    });

    this.client.connect();
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

  async onModuleDestroy() {
    await this.client.end();
  }
}
