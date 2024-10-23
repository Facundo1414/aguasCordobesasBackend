import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users.module';

@Module({
  imports: [
    ConfigModule,  // Asegúrate de que el ConfigModule esté configurado correctamente
    UsersModule,   // El módulo UsersModule se importa correctamente
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
