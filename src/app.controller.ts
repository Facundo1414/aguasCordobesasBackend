// controllers/AppController.ts
import { Controller, Get, HttpStatus, Param, Request, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { FileStorageService } from './files/services/FileStorageService';
import { AuthGuard } from './users/services/auth.guard';
import * as jwt from 'jsonwebtoken';
import { UserService } from './users/services/users.service';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fileStorageService: FileStorageService,
    private readonly userService: UserService,
  ) {}

  private async extractUserIdFromToken(token: string): Promise<string | null> {
    if (!token) {
      console.error('No token provided.');
      return null;
    }

    try {
      const secret = process.env.JWT_SECRET || 'Secret not set';
      const decoded: any = jwt.verify(token, secret);
      if (decoded.userId) return decoded.userId;
      
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
}
