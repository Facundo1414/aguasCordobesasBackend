// tokens.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../jwt/refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  exports: [TypeOrmModule], // Exporta TypeOrmModule para que otros módulos puedan usarlo
})
export class TokensModule {}
