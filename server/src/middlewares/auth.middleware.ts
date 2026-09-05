import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import { User, UserRole } from '../entities/User';
import { AppDataSource } from '../config/data-source';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers.authorization) {
    token = req.headers.authorization.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next(new UnauthorizedError('Authentication token missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return next(new UnauthorizedError('Account is inactive or suspended'));
    }

    req.user = { userId: user.id, role: user.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
