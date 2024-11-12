import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { join } from 'path';
import { FilterFileService } from './FilterFileService';

@Injectable()
export class FileUploadService {

  constructor(private readonly filterFileService: FilterFileService) {}

  async handleFileUpload(file: Express.Multer.File, userId: string) {
    // Full path to the uploaded file
    const filePath = join(__dirname, '..', 'uploads', file.filename);
    
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      if (!Array.isArray(jsonData) || !Array.isArray(jsonData[0])) {
        throw new Error('Invalid file format');
      }
      console.log("user id in FILE service: " + userId);

      // Pass filePath and userId to processFile
      const savedFileNames = await this.filterFileService.processFile(filePath, userId);

      // Delete the file after processing
      fs.unlinkSync(filePath);

      return {
        message: 'File successfully uploaded and processed',
        savedFileNames,
      };
    } catch (error) {
      console.error('Error processing file:', error);
      throw new BadRequestException('Error processing file');
    }
  }
}
