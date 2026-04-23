/**
 * Domain-level errors. Infrastructure layers map these to HTTP status codes.
 */

export class DomainError extends Error {
  constructor(message: string, public readonly code: string = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class InvalidScoreError extends ValidationError {
  constructor(message: string) {
    super(`Invalid score: ${message}`);
    this.name = 'InvalidScoreError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}
