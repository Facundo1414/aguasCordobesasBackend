import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../services/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from '../jwt/refresh-token.entity';
import { Repository } from 'typeorm';
import { WhatsAppService } from 'src/whatsapp-service/services/WhatsappService';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    private whatsappService: WhatsAppService,
  ) {}


  async logout(userId: number): Promise<void> {
    await this.userService.removeRefreshToken(userId); // Invalida el refresh token
  }

// En AuthService al iniciar sesión en el backend
  async login(username: string, password: string): Promise<{ accessToken: string, refreshToken: string }> {
    const user = await this.userService.findUserByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const isPasswordValid = await this.userService.validatePassword(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
    
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    return { accessToken, refreshToken };
  }



  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1); // Establecer expiración a 1 días

    const newRefreshToken = this.refreshTokensRepository.create({
        token: refreshToken,
        expiresAt: expiryDate,
        user: { id: userId }, // Asegúrate de que el usuario se asigne correctamente
    });
    await this.refreshTokensRepository.save(newRefreshToken);
}



  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload;

    try {
      payload = this.jwtService.verify(refreshToken); // Verifica el refresh token
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verificar si el refresh token está almacenado y no ha expirado
    const storedRefreshToken = await this.refreshTokensRepository.findOne({
      where: { token: refreshToken, user: { id: payload.sub } },
    });

    if (!storedRefreshToken || storedRefreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const accessToken = this.jwtService.sign({ username: payload.username, sub: payload.sub });
    return { accessToken };
  }



  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userService.findUserByUsername(username);
    if (user && await this.userService.validatePassword(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async generateNewAccessToken(refreshToken: string): Promise<string> {
    // Verifica si el refresh token es válido (puedes almacenarlos en la base de datos y verificar)
    const payload = this.jwtService.verify(refreshToken); // Verificar el refresh token
    // Si el token es válido, generar un nuevo access token
    const newAccessToken = this.jwtService.sign({ username: payload.username, sub: payload.sub });
    return newAccessToken;
  }


  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
