import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/users/services/auth.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake.headers['authorization']?.split(' ')[1];

    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const validToken = await this.authService.validateToken(token);
      client.user = validToken; // Adjunta el usuario validado al cliente WebSocket
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
