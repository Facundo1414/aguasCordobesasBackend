import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './File.entity';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async saveFile(filename: string, path: string, userId: number): Promise<File> {
    const file = this.fileRepository.create({ filename, path, userId });
    return this.fileRepository.save(file);
  }

  async findFilesByUserId(userId: number): Promise<File[]> {
    return this.fileRepository.find({ where: { userId } });
  }
}
