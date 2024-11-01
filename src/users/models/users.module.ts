import { Module } from '@nestjs/common';
import { UserService } from '../services/users.service';
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User])],  // Elimina la coma inicial
  providers: [UserService],
  exports: [UserService],  // Exportamos UserService para usarlo en otros módulos
})
export class UsersModule {}
