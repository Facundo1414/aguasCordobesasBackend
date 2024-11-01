// error-handler.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ErrorHandlerService {
  private logger: Logger = new Logger(ErrorHandlerService.name);

  handleError(message: string, error: any) {
    this.logger.error(message, error);
    // Lógica adicional para manejar el error
  }
}
