import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verificar la salud del servidor' })
  @ApiResponse({ status: 200, description: 'El servidor está funcionando correctamente.' })
  checkHealth(@Res() res: Response): void {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Health Check</title>
        </head>
        <body>
          <h1>Hola, estoy funcionando</h1>
        </body>
      </html>
    `);
  }
}
