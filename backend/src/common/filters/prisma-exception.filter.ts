import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';
import { logger } from 'src/common/logger/logger';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ✅ Log the error to Winston (this goes to Console and your .log files)
    logger.error({
      message: `Prisma Error [${exception.code}]`,
      path: request.url,
      method: request.method,
      prismaMessage: exception.message.replace(/\n/g, ''),
      timestamp: new Date().toISOString(),
    });

    switch (exception.code) {
      case 'P2002': {
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'This record already exists.',
          error: 'Conflict',
        });
      }
      case 'P2025': {
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Conflict: This record was modified by another user. Please refresh.',
          error: 'Conflict',
        });
      }
      default:
        // Hand off 500s and other codes to the base NestJS filter
        super.catch(exception, host);
        break;
    }
  }
}
