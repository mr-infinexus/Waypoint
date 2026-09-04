import { AppDataSource } from '../config/data-source';
import { Service, ServiceType } from '../entities/Service';
import { Station } from '../entities/Station';
import { User } from '../entities/User';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';

export class ServiceCatalogService {
  private serviceRepository = AppDataSource.getRepository(Service);
  private stationRepository = AppDataSource.getRepository(Station);

  async createService(
    operatorId: string, 
    type: ServiceType, 
    serviceNumber: string,
    originStationId: string,
    destinationStationId: string,
    departureTime: Date,
    arrivalTime: Date,
    price: number,
    seatCapacity: number,
    vehicleLogo?: string
  ) {
    const originStation = await this.stationRepository.findOneBy({ id: originStationId });
    const destinationStation = await this.stationRepository.findOneBy({ id: destinationStationId });

    if (!originStation || !destinationStation) {
      throw new NotFoundError('Origin or destination station not found');
    }

    const existing = await this.serviceRepository.findOneBy({ serviceNumber });
    if (existing) {
      throw new BadRequestError('Service number already exists');
    }

    const service = this.serviceRepository.create({
      operator: { id: operatorId } as User,
      type,
      serviceNumber,
      originStation,
      destinationStation,
      departureTime,
      arrivalTime,
      price,
      seatCapacity,
      availableSeats: seatCapacity,
      vehicleLogo
    });

    return await this.serviceRepository.save(service);
  }

  async updateService(
    operatorId: string,
    serviceId: string,
    updates: Partial<Service>
  ) {
    const service = await this.serviceRepository.findOne({ 
      where: { id: serviceId },
      relations: { operator: true }
    });

    if (!service) throw new NotFoundError('Service not found');
    if (service.operator.id !== operatorId) {
      throw new ForbiddenError('You can only edit your own services');
    }

    Object.assign(service, updates);
    return await this.serviceRepository.save(service);
  }

  async deleteService(operatorId: string, serviceId: string) {
    const service = await this.serviceRepository.findOne({ 
      where: { id: serviceId },
      relations: { operator: true }
    });

    if (!service) throw new NotFoundError('Service not found');
    if (service.operator.id !== operatorId) {
      throw new ForbiddenError('You can only delete your own services');
    }

    await this.serviceRepository.remove(service);
    return { message: 'Service deleted successfully' };
  }

  async getMyServices(operatorId: string) {
    return await this.serviceRepository.find({
      where: { operator: { id: operatorId } },
      relations: { originStation: true, destinationStation: true }
    });
  }
}
