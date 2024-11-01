import { Module } from '@nestjs/common';
import { UserService } from '../services/users.service';
import { UsersModule } from './users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokenModule } from '../jwt/refresh-token.module';
import { AuthService } from '../services/auth.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: 'SECRET_KEY',
      signOptions: { expiresIn: '60m' },
    }),
    RefreshTokenModule
  ],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
