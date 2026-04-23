import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../application/use-cases/auth.use-case';
import { UnauthorizedError } from '../../domain/errors';

export type AuthRole = 'ADMIN' | 'ORGANIZER' | 'REFEREE' | 'PLAYER';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: AuthRole;
  };
}

/**
 * Extracts the Bearer token and attaches `req.user`.
 * Does NOT throw when the token is missing — use `requireAuth` for that.
 * This lets some endpoints be optionally authenticated (e.g. public ranking
 * can show extra fields when logged in).
 */
export function attachUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token) as {
      sub: string;
      email: string;
      role: AuthRole;
    };
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    // Invalid token — treat as anonymous. `requireAuth` will reject if needed.
  }
  next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  next();
}

export function requireRole(...roles: AuthRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError(
        `Forbidden — role ${req.user.role} cannot perform this action`,
      );
    }
    next();
  };
}
