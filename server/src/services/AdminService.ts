import { AppDataSource } from '../config/data-source';
import { Station } from '../entities/Station';
import { User, UserRole } from '../entities/User';
import { Itinerary, ItineraryStatus } from '../entities/Itinerary';
import { BadRequestError, NotFoundError } from '../utils/errors';
import bcrypt from 'bcryptjs';

export class AdminService {
  private stationRepository = AppDataSource.getRepository(Station);
  private userRepository = AppDataSource.getRepository(User);

  async createStation(code: string, name: string, city: string, latitude?: number, longitude?: number) {
    const existing = await this.stationRepository.findOneBy({ code });
    if (existing) throw new BadRequestError('Station code already exists');

    const station = this.stationRepository.create({ code, name, city, latitude, longitude });
    return await this.stationRepository.save(station);
  }

  async getAllStations() {
    return await this.stationRepository.find();
  }

  async onboardOperator(name: string, email: string, passwordPlain: string) {
    const existing = await this.userRepository.findOneBy({ email });
    if (existing) throw new BadRequestError('Email already exists');

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const operator = this.userRepository.create({ name, email, passwordHash, role: UserRole.OPERATOR });
    return await this.userRepository.save(operator);
  }

  async listOperators() {
    return await this.userRepository.find({ where: { role: UserRole.OPERATOR } });
  }

  async suspendOperator(operatorId: string) {
    const operator = await this.userRepository.findOneBy({ id: operatorId, role: UserRole.OPERATOR });
    if (!operator) throw new NotFoundError('Operator not found');

    operator.isActive = false;
    await this.userRepository.save(operator);
    return { message: 'Operator suspended successfully' };
  }

  async getDashboardStats() {
    const itineraryRepo = AppDataSource.getRepository(Itinerary);

    const totalOperators = await this.userRepository.count({ where: { role: UserRole.OPERATOR } });
    const activeItineraries = await itineraryRepo.count({ where: { status: ItineraryStatus.ACTIVE } });
    const disruptedItineraries = await itineraryRepo.count({ where: { status: ItineraryStatus.DISRUPTED } });

    return {
      totalOperators,
      activeItineraries,
      disruptedItineraries
    };
  }
}
