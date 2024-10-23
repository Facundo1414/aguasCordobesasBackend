// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private users = [
    { username: 'admin', password: 'admin123', id: 1 },  
  ];

  login(username: string, password: string, session: any) {
    const user = this.users.find(
      (u) => u.username === username && u.password === password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    session.userId = user.id; // Guarda el userId en la sesión
    session.token = uuidv4(); // Genera un token simple para la sesión (opcional)
    return { message: 'Login successful', userId: user.id };
  }

  isAuthenticated(session: any): boolean {
    return !!session.userId; // Verifica si el usuario está autenticado por la sesión
  }
}
