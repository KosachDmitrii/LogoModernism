import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';

type DatabaseError = {
  code?: unknown;
  message?: unknown;
};

export function isPostgreSqlPoolTimeout(error: unknown): error is DatabaseError {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as DatabaseError;
  const code = String(candidate.code ?? '');
  const message = String(candidate.message ?? '').toLowerCase();
  return (
    ['53300', '57P03', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(code) ||
    message.includes('connection pool') ||
    message.includes('timeout acquiring a client')
  );
}

@Catch()
export class PostgreSqlPoolTimeoutFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!isPostgreSqlPoolTimeout(exception)) {
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
