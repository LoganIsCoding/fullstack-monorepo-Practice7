import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const JWT_SECRET = 'supersecret123';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*',
  });
  await app.listen(4000);
}
bootstrap();
