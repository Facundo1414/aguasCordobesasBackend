import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() req) {
    const user = await this.authService.validateUser(req.username, req.password);
    if (!user) {
      return { message: 'Usuario o contraseña incorrectos' };
    }
    return this.authService.login(user);
  }
}
