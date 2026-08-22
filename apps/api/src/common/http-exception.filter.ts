import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';

const sensitivePattern = /(bearer\s+\S+|authorization\s*[:=]|jwt[_-]?secret\s*[:=]|smtp_pass\s*[:=]|password(hash)?\s*[:=]|token\s*[:=]\s*\S+)/i;

function safeMessage(value: unknown): string | string[] {
  if (Array.isArray(value)) return value.map((item) => safeMessage(item)).filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return 'Não foi possível concluir a solicitação.';
  return sensitivePattern.test(value) ? 'A solicitação contém dados inválidos.' : value;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const isMulter = exception instanceof MulterError;
    const status = isMulter && exception.code === 'LIMIT_FILE_SIZE'
      ? HttpStatus.PAYLOAD_TOO_LARGE
      : exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
    const message = isMulter && exception.code === 'LIMIT_FILE_SIZE'
      ? `O arquivo excede o limite de ${process.env.MAX_UPLOAD_SIZE_MB ?? 10} MB.`
      : status === 500 ? 'Ocorreu um erro interno. Tente novamente mais tarde.' : safeMessage(body.message ?? payload);
    const error = typeof body.error === 'string' ? body.error : HttpStatus[status] ?? 'Error';

    if (status >= 500) this.logger.error(`${request.method} ${request.originalUrl} - ${exception instanceof Error ? exception.message : 'erro desconhecido'}`);
    response.status(status).json({ statusCode: status, message, error, timestamp: new Date().toISOString(), path: request.originalUrl });
  }
}
