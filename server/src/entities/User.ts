import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Service } from './Service';
import { Itinerary } from './Itinerary';
import { Ticket } from './Ticket';

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  TRAVELER = 'traveler',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.TRAVELER })
  role: UserRole;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Service, (service) => service.operator)
  services: Service[];

  @OneToMany(() => Itinerary, (itinerary) => itinerary.traveler)
  itineraries: Itinerary[];

  @OneToMany(() => Ticket, (ticket) => ticket.traveler)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
