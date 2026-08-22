import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  const production = process.env.NODE_ENV === 'production';
  const configuredOrigins = (process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? '')
    .split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean);
  if (production && configuredOrigins.length === 0) {
    throw new Error('CORS_ORIGIN ou FRONTEND_URL deve ser configurado em produção.');
  }
  app.enableCors({
    origin: production ? configuredOrigins : [...new Set(['http://localhost:3000', ...configuredOrigins])],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT || process.env.API_PORT || 3001);

  await app.listen(port);

  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
