import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../services/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from '../jwt/refresh-token.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
  ) {}


  async logout(userId: number): Promise<void> {
    await this.userService.removeRefreshToken(userId); // Invalida el refresh token
  }

  async login(username: string, password: string): Promise<{ accessToken: string, refreshToken: string }> {
    const user = await this.userService.findUserByUsername(username);
    if (!user) {
      console.log('Usuario no encontrado');
      throw new UnauthorizedException('Invalid credentials');
  }

    const isPasswordValid = await this.userService.validatePassword(password, user.password);
    console.log('¿La contraseña es válida?', isPasswordValid); // Este log debería mostrar `true`

    if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
    }
    
    const payload = { username: user.username, sub: user.id };
    const accessToken = "";
    console.log("todo ok");

    try {
      const accessToken = this.jwtService.sign(payload);
      console.log("Access token generado correctamente:", accessToken);
    } catch (error) {
      console.error("Error al generar access token:", error);
      throw new UnauthorizedException('Error al generar access token');
    }
    

    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' }); // Generar el refresh token

    // Almacenar el refresh token en la base de datos o en otro lugar seguro
    await this.storeRefreshToken(user.id, refreshToken); // Método para almacenar el refresh token
  
    return { accessToken, refreshToken }; // Retornar ambos tokens
  }

  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Establecer expiración a 7 días

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
