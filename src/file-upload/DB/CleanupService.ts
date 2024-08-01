import { Injectable } from '@nestjs/common';
import { FileStorageService } from './FileStorageService';

@Injectable()
export class CleanupService {
  constructor(private readonly fileStorageService: FileStorageService) {}

  async cleanTemporaryFiles(): Promise<void> {
    await this.fileStorageService.cleanTempDir();
  }
}
