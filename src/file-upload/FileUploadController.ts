import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { join } from 'path';
import { FileUploadService } from './FileUploadService';

const UPLOADS_DIR = join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Controller('upload')
@ApiTags('upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('excel')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const extension = file.originalname.split('.').pop();
          cb(null, `${file.originalname}-${uniqueSuffix}.${extension}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('File received in controller:', file);
    if (!file) {
      throw new BadRequestException('Invalid file or file buffer');
    }
    // Puedes agregar más validaciones o procesamiento aquí
    return this.fileUploadService.handleFileUpload(file);
  }
}
