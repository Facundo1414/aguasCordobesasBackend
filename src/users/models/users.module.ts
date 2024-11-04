import { Module } from '@nestjs/common';
import { UserService } from '../services/users.service';
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokensModule } from './token.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), TokensModule],  // Elimina la coma inicial
  providers: [UserService],
  exports: [UserService,],  // Exportamos UserService para usarlo en otros módulos
})
export class UsersModule {}
