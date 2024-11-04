import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as session from 'express-session';
import { getConnection } from 'typeorm';

dotenv.config();

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);
  app.use(session({
    secret: process.env.JWT_SECRET ,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 60000,
    }, 
  }));

  app.enableCors({
    origin: '*', // Permite cualquier origen.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Mi API')
    .setDescription('La documentación de la API de mi proyecto')
    .setVersion('1.0')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();