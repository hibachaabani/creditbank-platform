import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.getResponse() : 'Erreur interne';
    this.logger.error(`[${req.method}] ${req.url} → ${status}`);
    if (exception instanceof Error) this.logger.error(exception.message);
    res.status(status).json({
      success: false, statusCode: status, timestamp: new Date().toISOString(), path: req.url,
      message: typeof message === 'object' && 'message' in (message as object) ? (message as any).message : message,
    });
  }
}
