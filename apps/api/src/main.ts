import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: ['http://localhost:5173', 'http://localhost:3000'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Logo Platform API running on http://localhost:${port}/api`);
}

bootstrap();
