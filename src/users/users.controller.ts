import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { IsNotEmpty, IsString } from 'class-validator';

// DTO para la creación de un usuario
class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Ruta para obtener todos los usuarios (opcional)
  @Get()
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  // Ruta para crear un nuevo usuario
  @Post('create')
  async createUser(@Body() body: CreateUserDto) {
    const { username, password } = body;
    return this.usersService.createUser(username, password);
  }

  // Ruta para obtener un usuario por su nombre de usuario
  @Get(':username')
  async getUserByUsername(@Param('username') username: string) {
    return this.usersService.findOne(username);
  }
}
