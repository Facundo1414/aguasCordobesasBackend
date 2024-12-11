import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('whatsapp_sessions')
export class WhatsAppSessionEntity {
  @PrimaryColumn()
  user_id: string;

  @Column('jsonb')
  session_data: Record<string, any>;

  @UpdateDateColumn()
  updated_at: Date;
}
