import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { ItinerarySegment } from './ItinerarySegment';

export enum ItineraryStatus {
  ACTIVE = 'active',
  DISRUPTED = 'disrupted',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface WalkLeg {
  distanceKm: number;
  durationMinutes: number;
  toStationId?: string;
  fromStationId?: string;
}

@Entity('itineraries')
export class Itinerary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.itineraries)
  traveler: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalCost: number;

  @Column({ type: 'enum', enum: ItineraryStatus, default: ItineraryStatus.ACTIVE })
  status: ItineraryStatus;

  @Column({ type: 'jsonb', nullable: true })
  originWalk: WalkLeg | null;

  @Column({ type: 'jsonb', nullable: true })
  destinationWalk: WalkLeg | null;

  @Column({ type: 'jsonb', nullable: true })
  pendingAlternatives: any | null;

  @OneToMany(() => ItinerarySegment, (segment) => segment.itinerary, { cascade: true })
  segments: ItinerarySegment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
