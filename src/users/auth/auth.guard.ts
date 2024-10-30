// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.split(' ')[1]; // Obtener el token del header

    if (!token) return false; // Si no hay token, denegar acceso

    try {
        const validToken = await this.authService.validateToken(token); // Lógica para validar el token
        request.user = validToken; // Attach the validated user to the request object
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }  
    
    }
}
