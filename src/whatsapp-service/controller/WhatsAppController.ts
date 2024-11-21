// controllers/WhatsAppController.ts
import { Controller, Get, HttpStatus, Request, Res, UseGuards, Param, Options } from '@nestjs/common';
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

  // Este método maneja las solicitudes OPTIONS para todas las rutas del controlador
  @Options('*')
  handleOptions(@Res() res: Response) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(HttpStatus.OK).json({ message: 'CORS headers set successfully' });
  }

  @UseGuards(AuthGuard)
  @Get('initialize')
  async initializeWhatsApp(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);
  
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }
  
    // Check if the WhatsApp session is already active
    const isSessionActive = await this.whatsappService.checkSessionStatus(userId);
    if (isSessionActive) {
      const isLoggedIn = await this.whatsappService.isWhatsAppUser("5493513479404", userId);
      if (isLoggedIn) {
        return res.status(HttpStatus.OK).json({ message: 'SessionActive' });
      }
    }
  
    // If not active, initialize a new session
    try {
      console.log(`Inicializando cliente de WhatsApp para usuario: ${userId}`);
      const { client, qrCode } = await this.whatsappService.initializeWhatsApp(userId);
      return res.status(HttpStatus.OK).json({
        message: 'Sesión de WhatsApp inicializada',
        clientId: userId,
        qrCode,
      });
    } catch (error) {
      console.error('Error al inicializar sesión de WhatsApp:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Fallo al inicializar la sesión de WhatsApp' });
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
