import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Multer rejects an upload (e.g. LIMIT_FILE_SIZE) by throwing a plain MulterError,
    // not an HttpException — without this it would otherwise fall through to a 500.
    if (exception instanceof MulterError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        path: request.url,
        timestamp: new Date().toISOString(),
        message: this.multerErrorMessage(exception),
      });
      return;
    }

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : null;

    const message = isHttpException
      ? typeof body === 'string'
        ? body
        : (body as any)?.message ?? exception.message
      : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }

  private multerErrorMessage(error: MulterError): string {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return 'Uploaded file exceeds the maximum allowed size';
    }
    return error.message || 'Invalid file upload';
  }
}
