import { Request, Response } from 'express';
import { RegisterUserUseCase, LoginUseCase } from '../../application/use-cases/auth.use-case';
import { UserRepository } from '../../infrastructure/repositories/misc.repositories';
import { registerSchema, loginSchema } from '../../application/dto/schemas';

const userRepo = new UserRepository();
const registerUseCase = new RegisterUserUseCase(userRepo);
const loginUseCase = new LoginUseCase(userRepo);

export const AuthController = {
  async register(req: Request, res: Response): Promise<void> {
    const dto = registerSchema.parse(req.body);
    const result = await registerUseCase.execute(dto);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response): Promise<void> {
    const dto = loginSchema.parse(req.body);
    const result = await loginUseCase.execute(dto);
    res.json(result);
  },
};
