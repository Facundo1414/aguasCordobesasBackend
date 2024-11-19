import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as session from 'express-session';
import { getConnection } from 'typeorm';
import { TimeoutInterceptor } from './timeOutInterceptor';

dotenv.config();

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);
  app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 3600000, // 1 hora
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
        httpOnly: true, // Protege la cookie contra accesos del cliente
      },
    }),
  );
  

  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log('Preflight request received');
    }
    next();
  });
  
  app.useGlobalInterceptors(new TimeoutInterceptor());


  app.enableCors({
    origin: ['https://aguas-cordobesas-front.vercel.app','https://bright-trout-amazingly.ngrok-free.app','http://localhost:3001'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
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


"ngrok http --url=bright-trout-amazingly.ngrok-free.app 3000"