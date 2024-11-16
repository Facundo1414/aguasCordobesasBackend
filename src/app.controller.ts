// controllers/AppController.ts
import { Controller, Get, HttpStatus, Param, Request, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) {}

}
