import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users.module';

@Module({
  imports: [
    UsersModule,   // El módulo UsersModule se importa correctamente
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
