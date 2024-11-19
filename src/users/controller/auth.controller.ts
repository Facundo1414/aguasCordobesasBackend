import { Controller, Post, Body, HttpStatus, Res, UseGuards, Req, Get, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../services/users.service';
import { AuthService } from '../services/auth.service';
import * as jwt from 'jsonwebtoken';

@Controller('/api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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

      if (decoded.userId) {
        return decoded.userId;
      }
      
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

  @Post('login')
  async login(@Body() body: any, @Res() res: Response) {
    const { username, password } = body;
    try {
      const loginResult = await this.authService.login(username, password);
  
      console.log(`User ${username} has authenticated`);
  
      return res.status(HttpStatus.OK).json({
        ...loginResult,
        username, 
      });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    }
  }
  


  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() request: any): Promise<{ message: string }> {
    const authorizationHeader = request.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Invalid token format');
    }
  
    const token = authorizationHeader.split(' ')[1];
    const userId = await this.extractUserIdFromToken(token);
  
    if (!userId || isNaN(Number(userId))) {
      throw new UnauthorizedException('User not authenticated');
    }
  
    await this.authService.logout(Number(userId)); // Invalida el refresh token
    return { message: 'Logged out successfully' };
  }
  
  


  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    // Lógica para validar el refresh token
    // Si es válido, genera un nuevo access token y retorna ambos
    const newAccessToken = await this.authService.generateNewAccessToken(body.refreshToken);
    return { accessToken: newAccessToken };
  }

  @Post('register')
  async register(@Body() body: { username: string; password: string }, @Res() res: Response) {
    const { username, password } = body;
    try {
      const newUser = await this.userService.register(username, password);
      return res.status(HttpStatus.CREATED).json(newUser);
    } catch (error) {
      return res.status(HttpStatus.CONFLICT).json({ message: error.message });
    }
  }


  @Post('validate-token')
  @UseGuards(AuthGuard('jwt'))
  async validateToken(@Req() req: any, @Res() res: Response) {
    try {
      // Si el guard pasa, el token es válido
      return res.status(HttpStatus.OK).json({ message: 'Token is valid' });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
    }
  }

}
