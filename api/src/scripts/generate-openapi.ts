import { NestFactory } from '@nestjs/core';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { AppModule } from '@/modules/app/app.module';
import { buildSwaggerConfig } from '@/common/swagger/swagger-document';
import { SwaggerModule } from '@nestjs/swagger';

function resolveOutputPath(): string {
  const args = process.argv.slice(2);
  const outputArgIndex = args.findIndex((arg) => arg === '--output');
  const outputFromArg =
    outputArgIndex >= 0 && args[outputArgIndex + 1]
      ? args[outputArgIndex + 1]
      : args[0];

  const output =
    outputFromArg ||
    process.env.OPENAPI_OUTPUT_FILE ||
    resolve(process.cwd(), 'openapi.json');

  return resolve(process.cwd(), output);
}

async function generateOpenApiSpec() {
  const outputPath = resolveOutputPath();
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    console.log(`✅ OpenAPI spec generated at: ${outputPath}`);
  } finally {
    await app.close();
  }
}

generateOpenApiSpec().catch((error) => {
  console.error('❌ Failed to generate OpenAPI spec:', error);
  process.exit(1);
});
