import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/users/services/auth.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();  // Get WebSocket client
    const token = client.handshake.headers['authorization']?.split(' ')[1]; // Get token from headers
    console.log('Received Token:', token); // Log token for debugging

    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const validToken = await this.authService.validateToken(token); // Validate the token
      console.log('Token is valid:', validToken); // Log validated token

      client.user = validToken; // Attach the user object to the WebSocket client
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
