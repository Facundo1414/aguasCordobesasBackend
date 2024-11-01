import { Controller, Post, Body, HttpStatus, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../services/users.service';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService, 
  ) {}

  @Post('login')
  async login(@Body() body: any, @Res() res: Response) {
    const { username, password } = body;
    try {
      const loginResult = await this.authService.login(username, password);
      return res.status(HttpStatus.OK).json(loginResult);
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    }
  }


  @Post('logout')
  @UseGuards(AuthGuard('jwt')) // Asegúrate de tener un guardia de autenticación para proteger esta ruta
  async logout(@Req() request: any) {
    return this.authService.logout(request.user.id); // Invalida el refresh token
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
}
