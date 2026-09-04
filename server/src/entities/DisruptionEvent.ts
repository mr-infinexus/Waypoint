import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Service } from './Service';
import { User } from './User';

export enum DisruptionType {
  DELAY = 'delay',
  CANCELLATION = 'cancellation',
}

@Entity('disruption_events')
export class DisruptionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Service)
  service: Service;

  @Column({ type: 'enum', enum: DisruptionType })
  type: DisruptionType;

  @Column({ type: 'int', nullable: true })
  delayMinutes: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User)
  reportedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
