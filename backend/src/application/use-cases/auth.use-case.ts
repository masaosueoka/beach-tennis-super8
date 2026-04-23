import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../infrastructure/repositories/misc.repositories';
import { ConflictError, UnauthorizedError } from '../../domain/errors';
import { RegisterDto, LoginDto } from '../dto/schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string; role: string };
}

export class RegisterUserUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role ?? 'PLAYER',
    });

    const token = signToken(user);
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}

export class LoginUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    const token = signToken(user);
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}

function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): { sub: string; email: string; role: string } {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
