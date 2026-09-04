import { AppDataSource } from '../config/data-source';
import { User, UserRole } from '../entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BadRequestError, UnauthorizedError } from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(name: string, email: string, passwordPlain: string, role: UserRole = UserRole.TRAVELER) {
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    
    const user = this.userRepository.create({
      name,
      email,
      passwordHash,
      role,
    });

    await this.userRepository.save(user);

    return this.generateToken(user);
  }

  async login(email: string, passwordPlain: string) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const payload = { userId: user.id, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }
}
