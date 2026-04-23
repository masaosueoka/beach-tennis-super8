import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(AuthController.register));
authRouter.post('/login', asyncHandler(AuthController.login));
