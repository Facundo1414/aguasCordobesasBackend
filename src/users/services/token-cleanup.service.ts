import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, LessThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from '../jwt/refresh-token.entity';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTokenCleanup() {
    const now = new Date();

    // Elimina los tokens cuya fecha de expiración es anterior a la fecha actual
    const result = await this.refreshTokensRepository.delete({
      expiresAt: LessThan(now),
    });

    this.logger.log(`Limpieza de tokens completada. Tokens eliminados: ${result.affected}`);
  }
}
