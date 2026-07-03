import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BigIntInterceptor } from './bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for mobile clients
  app.enableCors();

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

  // Configure Swagger Documentation
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

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`✓ NestJS Fitness API is running on: http://localhost:${port}`);
  console.log(`✓ Swagger API Documentation at: http://localhost:${port}/api/docs`);
}
bootstrap();
