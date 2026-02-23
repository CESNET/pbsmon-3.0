import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('PBSMON API')
    .setDescription('API for showing data from Metacentrum computing grid')
    .setVersion('1.0')
    .addServer('/api', 'Production API')
    .addServer('/', 'Development API')
    .build();
}

export function setupSwagger(app: INestApplication) {
  const config = buildSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  return document;
}
