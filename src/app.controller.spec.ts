import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { beforeEach, describe } from 'node:test';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });


});
