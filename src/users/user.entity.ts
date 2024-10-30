// user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { RefreshToken } from './jwt/refresh-token.entity';

@Entity('users') 
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true }) // Propiedad para el refreshToken
  refreshToken: string | null;

  @Column({ type: 'timestamp', nullable: true }) // Fecha de expiración del refreshToken
  refreshTokenExpiry: Date | null; // Esto permite que sea nulo si no hay token

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user) // Relación uno a muchos
  refreshTokens: RefreshToken[];
}
