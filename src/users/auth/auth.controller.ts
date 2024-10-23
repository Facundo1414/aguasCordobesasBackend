import { Controller, Get, Post, Req, Res, HttpStatus, Body, Session } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: any, @Session() session: Record<string, any>, @Res() res: Response) {
    const { username, password } = body;
    try {
      const loginResult = this.authService.login(username, password, session);
      return res.status(HttpStatus.OK).json(loginResult);
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    }
  }

  @Post('logout')
  logout(@Session() session: Record<string, any>) {
    session.userId = null; // Elimina el ID del usuario de la sesión
    return { message: 'Sesión cerrada' };
  }
}
