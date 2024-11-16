import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FileUpload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column()
  path: string;

  @Column()
  userId: number; // Relación con la tabla de Usuarios

  @Column({ default: false })
  processed: boolean; // Nueva columna para marcar si el archivo ha sido procesado
}
