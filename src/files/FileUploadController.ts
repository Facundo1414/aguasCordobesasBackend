import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Session,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { join } from 'path';
import { FileUploadService } from './FileUploadService';
import { AuthGuard } from 'src/users/auth/auth.guard';

const UPLOADS_DIR = join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Controller('upload')
@ApiTags('upload')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('excel')
  @UseGuards(AuthGuard) // Aplica el guard
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Headers('Authorization') token: string, // Recibe el token del encabezado
    @Session() session: Record<string, any>, // Acceso a la sesión
  ) {
    console.log('File received in controller:', file);
    if (!file) {
      throw new BadRequestException('Invalid file or file buffer');
    }

    if (!session.userId) {
      throw new BadRequestException('User not authenticated');
    }

    try {
      // Procesa el archivo con la sesión activa (por ejemplo, usando session.userId)
      const result = await this.fileUploadService.handleFileUpload(file);
      return result;
    } catch (error) {
      console.error('Error processing file:', error);
      throw new BadRequestException('Error processing file');
    }
  }
}
