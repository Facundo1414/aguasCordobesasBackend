import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from '../models/File.entity'; 

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileUpload) 
    private readonly fileRepository: Repository<FileUpload>,
  ) {}

  async saveFile(filename: string, path: string, userId: number): Promise<FileUpload> {
    const file = this.fileRepository.create({ filename, path, userId });
    return this.fileRepository.save(file);
  }

  async findFilesByUserId(userId: number): Promise<FileUpload[]> {
    return this.fileRepository.find({ where: { userId } });
  }
}
