import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BigIntInterceptor } from './bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for mobile clients and known web front-ends.
  // Restrict to an explicit allow-list instead of reflecting any origin.
  // Override via CORS_ORIGINS (comma-separated) if the deployment differs.
  const defaultCorsOrigins = [
    'https://protein.tn',
    'https://www.protein.tn',
    'https://admin.protein.tn',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const corsOrigins = (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : defaultCorsOrigins
  )
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Raise the JSON body limit above Express's 100kb default so meal-scan photo uploads (base64) fit
  app.use(json({ limit: '10mb' }));

  // Global pipes for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global BigInt serializer interceptor
  app.useGlobalInterceptors(new BigIntInterceptor());

  // Configure Swagger Documentation.
  // Only expose the docs outside production, or when explicitly enabled,
  // so the full API surface is not published on the live deployment.
  const swaggerEnabled =
    process.env.ENABLE_SWAGGER === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Protein.tn Fitness API')
      .setDescription(
        'API documentation for Protein.tn Fitness ecosystem mobile features. Links with Laravel MySQL tables.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`✓ NestJS Fitness API is running on: http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(
      `✓ Swagger API Documentation at: http://localhost:${port}/api/docs`,
    );
  }
}
bootstrap();
