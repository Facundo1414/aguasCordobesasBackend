import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as session from 'express-session';
import { TimeoutInterceptor } from './timeOutInterceptor';

// Cargar variables de entorno
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de sesiones
  app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 3600000, // 1 hora
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
        httpOnly: true, // Protege la cookie contra accesos del cliente
        sameSite: 'None', // Permitir cross-origin
      },
    }),
  );

  // Middlewares globales
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });



  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', req.headers.origin); // El origen específico
      res.header('Access-Control-Allow-Credentials', 'true'); // Permitir credenciales
      res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      return res.status(204).json({});
    }
    next();
  });
  

  // Configuración de CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Lista de orígenes permitidos
      const allowedOrigins = [
        'https://aguas-cordobesas-front.vercel.app',
        'https://bright-trout-amazingly.ngrok-free.app', 
        'http://localhost:3001',
        'http://localhost:3000',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true, // Permitir el envío de cookies
    allowedHeaders: ['Content-Type', 'Authorization', 'x-forwarded-for', 'x-forwarded-proto'],
  });

  // Configuración de validación global y timeout interceptor
  app.useGlobalInterceptors(new TimeoutInterceptor());
  app.useGlobalPipes(new ValidationPipe());

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Mi API')
    .setDescription('La documentación de la API de mi proyecto')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Inicio de la aplicación
  await app.listen(process.env.PORT || 3000);
}

bootstrap();

'ngrok http --url=bright-trout-amazingly.ngrok-free.app 3000 --host-header=rewrite'