import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Session,
  Headers,
  UseGuards,
  Req,
  Request,
  HttpStatus,
  Get,
  Param,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { join } from 'path';
import { FileUploadService } from '../services/FileUploadService';
import { AuthGuard } from 'src/users/services/auth.guard';
import { CustomRequest } from 'src/interfaces/custom-request.interface';
import * as jwt from 'jsonwebtoken';
import { UserService } from 'src/users/services/users.service';
import { FileStorageService } from '../services/FileStorageService';
import { Response } from 'express';

const UPLOADS_DIR = join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Controller('api/upload')
@ApiTags('upload')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly userService: UserService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  private async extractUserIdFromToken(token: string): Promise<string | null> {
    if (!token) {
      console.error('No token provided.');
      return null;
    }

    try {
      const secret = process.env.JWT_SECRET;
      const decoded: any = jwt.verify(token, secret);      
      
      if (decoded.username) {        
        const user = await this.userService.findUserByUsername(decoded.username);
        return user ? user.id.toString() : null;
      }

      console.error('Neither User ID nor username found in token payload.');
      return null;
    } catch (error) {
      console.error('Error decoding token:', error.message);
      return null;
    }
  }

  @Post('excel')
  @UseGuards(AuthGuard) 
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
    @Request() req: any,
    @Req() request: CustomRequest 
  ) {
    console.log('File received in controller:', file);
    if (!file) {
      throw new BadRequestException('Invalid file or file buffer');
    }

    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);
    
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    console.log("user id in FILE CONTROLLER: " + userId);
    
    
    try {
      // Pass the extracted userId to the service
      const result = await this.fileUploadService.handleFileUpload(file, userId);
      return result;
    } catch (error) {
      console.error('Error processing file:', error);
      throw new BadRequestException('Error processing file');
    }
  }

  @UseGuards(AuthGuard)
  @Get('getFileByName/:fileName')
  async getFileByName(@Param('fileName') fileName: string, @Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);
    
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

    try {
      const filePath = await this.fileStorageService.getFilePath(fileName);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(HttpStatus.NOT_FOUND).send('File not found.');
    }
  }

  @UseGuards(AuthGuard)
  @Get('file-status')
  async checkFileStatus(@Query('filename') fileName: string, @Request() req: any, @Res() res: Response) {
    if (!fileName) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'File name is required' });
    }

    try {
      // Verifica si el archivo ha sido procesado
      const isProcessed = await this.fileStorageService.isFileProcessed(fileName);
      
      if (isProcessed) {
        return res.status(HttpStatus.OK).json({ status: 'processed', message: 'File has been processed' });
      } else {
        return res.status(HttpStatus.OK).json({ status: 'processing', message: 'File is still being processed' });
      }
    } catch (error) {
      console.error('Error checking file status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error checking file status' });
    }
  }
}
