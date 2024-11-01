import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../models/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findUserByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Establecer expiración a 7 días

    await this.usersRepository.update(userId, {
        refreshToken,
        refreshTokenExpiry: expiryDate,
    });
}

  async removeRefreshToken(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: null }); // O elimina la relación si usas una tabla separada
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
