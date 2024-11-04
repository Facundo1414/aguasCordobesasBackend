import { Module } from '@nestjs/common';
import { UserService } from '../services/users.service';
import { UsersModule } from './users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokenModule } from '../jwt/refresh-token.module';
import { AuthService } from '../services/auth.service';
import { TokenCleanupService } from '../services/token-cleanup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../jwt/refresh-token.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,      
      signOptions: { expiresIn: '60m' },
    }),
    
    UsersModule,
    PassportModule,
    RefreshTokenModule,
    TypeOrmModule.forFeature([RefreshToken])
  ],
  providers: [AuthService, TokenCleanupService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {
  constructor() {
  }}
