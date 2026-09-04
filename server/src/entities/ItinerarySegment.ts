import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Itinerary } from './Itinerary';
import { Service } from './Service';
import { Ticket } from './Ticket';

@Entity('itinerary_segments')
export class ItinerarySegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Itinerary, (itinerary) => itinerary.segments, { onDelete: 'CASCADE' })
  itinerary: Itinerary;

  @ManyToOne(() => Service)
  service: Service;

  @Column({ type: 'int' })
  segmentOrder: number;

  @OneToMany(() => Ticket, (ticket) => ticket.itinerarySegment, { cascade: true })
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
