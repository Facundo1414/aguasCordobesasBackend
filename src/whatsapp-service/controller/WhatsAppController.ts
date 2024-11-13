// controllers/WhatsAppController.ts
import { Controller, Get, HttpStatus, Request, Res, UseGuards, Param } from '@nestjs/common';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { WhatsAppService } from '../services/WhatsappService';
import { UserService } from 'src/users/services/users.service';
import { AuthGuard } from 'src/users/services/auth.guard';

@Controller('api/whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
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
  @Get('initialize')
  async initializeWhatsApp(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

    try {
      const client = await this.whatsappService.initializeWhatsApp(userId);
      return res.status(HttpStatus.OK).json({ message: 'WhatsApp session initialized', clientId: userId });
    } catch (error) {
      console.error('Error initializing WhatsApp session:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to initialize WhatsApp session' });
    }
  }

  @UseGuards(AuthGuard)
  @Get('qrcode')
  async getQRCode(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);

    try {
      const qrCodeBase64 = await this.whatsappService.getQRCode(userId);
      return res.status(HttpStatus.OK).json({ qrCode: qrCodeBase64 });
    } catch (error) {
      console.error('Error fetching QR code:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Unable to retrieve QR code' });
    }
  }

  
  @UseGuards(AuthGuard)
  @Get("isLoggedIn")
  async getIsLoggedIn(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

    try {
      const isLoggedIn = await this.whatsappService.isWhatsAppUser("5493513479404", userId);
      return res.status(HttpStatus.OK).json({ isLoggedIn });
    } catch (error) {
      console.error('Error checking if user is logged in:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An error occurred while checking the user.' });
    }
  }


  @UseGuards(AuthGuard)
  @Get('logout')
  async logout(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

    try {
      await this.whatsappService.logout(userId);
      return res.status(HttpStatus.OK).json({ message: 'WhatsApp session has been logged out successfully' });
    } catch (error) {
      console.error('Error logging out WhatsApp session:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to logout WhatsApp session' });
    }
  }


}
