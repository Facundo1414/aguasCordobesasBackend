import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  dotenv.config();

  app.use(session({
    secret: "QkrV12gpqFjtW-NeLWuSdEgB4lvoGExnmN8koA-z2vGuUH0UwfhLBJwz2cmPw61M", // Cambia esto a una cadena secreta más segura
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 60000, // Tiempo de vida de la cookie (en milisegundos)
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
