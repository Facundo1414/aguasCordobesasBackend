import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Definición de la interfaz User
export interface User {
  id: number;
  username: string;
  password: string;
}

@Injectable()
export class UsersService {
  // Simulación de base de datos de usuarios
  private users: User[] = [
    { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10) },
  ];

  // Método para obtener todos los usuarios (opcional)
  getAllUsers(): User[] {
    return this.users;
  }

  // Método para buscar un usuario por su nombre de usuario
  async findOne(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  // Método para validar la contraseña
  async validatePassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  // Método para crear un nuevo usuario
  async createUser(username: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: this.users.length + 1,
      username,
      password: hashedPassword,
    };
    this.users.push(newUser);
    return newUser;
  }
}
