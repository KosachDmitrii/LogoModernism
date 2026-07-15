import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';
import { isPrismaConnectionError } from '@logo-platform/database';

type PrismaLikeError = {
  code?: unknown;
};

export function isPrismaPoolTimeout(error: unknown): error is PrismaLikeError {
  return (
    isPrismaConnectionError(error) ||
    (typeof error === 'object' &&
      error !== null &&
      ['P1008', 'P2024'].includes(String((error as PrismaLikeError).code)))
  );
}

@Catch()
export class PrismaPoolTimeoutFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!isPrismaPoolTimeout(exception)) {
      super.catch(exception, host);
      return;
    }

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const retryAfter = Math.max(1, Number(process.env.DB_POOL_RETRY_AFTER_SECONDS) || 1);

    response.setHeader('Retry-After', String(retryAfter));
    response.status(503).json({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Database connection pool is temporarily unavailable',
      requestId: request.header(REQUEST_ID_HEADER),
    });
  }
}
