import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from './User';
import { Station } from './Station';

export enum ServiceType {
  FLIGHT = 'flight',
  TRAIN = 'train',
  BUS = 'bus',
  METRO = 'metro',
  WALK = 'walk',
}

@Entity('services')
@Index(['originStation', 'departureTime'])
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ServiceType })
  type: ServiceType;

  @Column({ unique: true })
  serviceNumber: string;

  @ManyToOne(() => User, (user) => user.services)
  operator: User;

  @ManyToOne(() => Station)
  originStation: Station;

  @ManyToOne(() => Station)
  destinationStation: Station;

  @Column({ type: 'timestamp' })
  departureTime: Date;

  @Column({ type: 'timestamp' })
  arrivalTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  seatCapacity: number;

  @Column({ type: 'int' })
  availableSeats: number;

  @Column({ nullable: true })
  vehicleLogo: string;

  @Column({ default: false })
  isDelayed: boolean;

  @Column({ default: false })
  isCancelled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
