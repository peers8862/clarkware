import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(404, message, 'NOT_FOUND');
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, message, 'FORBIDDEN');
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(401, message, 'UNAUTHORIZED');
}

export function badRequest(message: string): AppError {
  return new AppError(400, message, 'BAD_REQUEST');
}

export function errorHandler(
  error: FastifyError | AppError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    void reply.status(error.statusCode).send({
      error: error.code ?? 'ERROR',
      message: error.message,
    });
    return;
  }

  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) console.error('[500 ERROR]', error.message, error.stack);
  void reply.status(statusCode).send({
    error: error.code ?? 'INTERNAL_ERROR',
    message: statusCode >= 500 ? 'Internal server error' : error.message,
  });
}
