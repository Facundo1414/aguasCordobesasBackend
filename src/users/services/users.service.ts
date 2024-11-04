import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../models/user.entity';
import { RefreshToken } from '../jwt/refresh-token.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  async findUserByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Establecer expiración a 7 días

    const newRefreshToken = this.refreshTokensRepository.create({
      token: refreshToken,
      expiresAt: expiryDate,
      user: user, // Asocia el token al usuario
    });

    await this.refreshTokensRepository.save(newRefreshToken);
  }

  async removeRefreshToken(userId: number): Promise<void> {
    await this.refreshTokensRepository.delete({ user: { id: userId } });
  }

  async register(username: string, password: string): Promise<User> {
    const existingUser = await this.findUserByUsername(username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash de la contraseña

    const newUser = this.usersRepository.create({
      username,
      password: hashedPassword,
    });

    return this.usersRepository.save(newUser);
  }
}
