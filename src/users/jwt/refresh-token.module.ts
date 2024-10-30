import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity'; 

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])], 
  exports: [TypeOrmModule], // Exporta el TypeOrmModule para que otros módulos puedan usar el repositorio
})
export class RefreshTokenModule {}
