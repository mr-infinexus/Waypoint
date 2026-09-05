import { AppDataSource } from "../config/data-source";
import { Station } from "../entities/Station";
import { User, UserRole } from "../entities/User";
import { Itinerary, ItineraryStatus } from "../entities/Itinerary";
import { BadRequestError, NotFoundError } from "../utils/errors";

export class AdminService {
  private stationRepository = AppDataSource.getRepository(Station);
  private userRepository = AppDataSource.getRepository(User);
  private itineraryRepository = AppDataSource.getRepository(Itinerary);

  async createStation(code: string, name: string, city: string, latitude?: number, longitude?: number) {
    const existing = await this.stationRepository.findOneBy({ code });
    if (existing) throw new BadRequestError("Station code already exists");

    const station = this.stationRepository.create({ code, name, city, latitude, longitude });
    return await this.stationRepository.save(station);
  }

  async getAllStations() {
    return await this.stationRepository.find({
      order: { city: "ASC", name: "ASC" }
    });
  }

  async listOperators() {
    return await this.userRepository.find({
      where: { role: UserRole.OPERATOR },
      order: { createdAt: "DESC" }
    });
  }

  async suspendOperator(operatorId: string) {
    const operator = await this.userRepository.findOneBy({ id: operatorId, role: UserRole.OPERATOR });
    if (!operator) throw new NotFoundError("Operator not found");

    operator.isActive = false;
    await this.userRepository.save(operator);
    return { message: "Operator access revoked successfully" };
  }

  async activateOperator(operatorId: string) {
    const operator = await this.userRepository.findOneBy({ id: operatorId, role: UserRole.OPERATOR });
    if (!operator) throw new NotFoundError("Operator not found");

    operator.isActive = true;
    await this.userRepository.save(operator);
    return { message: "Operator access granted successfully" };
  }

  async listUsers() {
    return await this.userRepository.find({
      where: { role: UserRole.TRAVELER },
      order: { createdAt: "DESC" }
    });
  }

  async suspendUser(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId, role: UserRole.TRAVELER });
    if (!user) throw new NotFoundError("User not found");

    user.isActive = false;
    await this.userRepository.save(user);
    return { message: "User access revoked successfully" };
  }

  async activateUser(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId, role: UserRole.TRAVELER });
    if (!user) throw new NotFoundError("User not found");

    user.isActive = true;
    await this.userRepository.save(user);
    return { message: "User access granted successfully" };
  }

  async getDashboardStats() {
    const totalOperators = await this.userRepository.count({ where: { role: UserRole.OPERATOR } });
    const activeItineraries = await this.itineraryRepository.count({ where: { status: ItineraryStatus.ACTIVE } });
    const disruptedItineraries = await this.itineraryRepository.count({ where: { status: ItineraryStatus.DISRUPTED } });

    return {
      totalOperators,
      activeItineraries,
      disruptedItineraries
    };
  }
}
