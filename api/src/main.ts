import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/modules/app/app.module';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppConfig } from './config/app.config';
import { setupSwagger } from './common/swagger/swagger-document';
import * as cookieParser from 'cookie-parser';
import './common/types/session.types';

const session = require('express-session');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware
  app.use(cookieParser());

  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set');
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax', // Allows cookies to be sent on top-level navigations (OIDC redirects)
        path: '/', // Ensure cookie is available for all paths
      },
    }),
  );

  // Enable CORS

  const frontendUrl = process.env.FRONTEND_URL || '';
  const allowedOrigins: string[] = frontendUrl
    ? frontendUrl.split(',').map((url) => url.trim())
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow all localhost origins
        if (
          process.env.NODE_ENV !== 'production' &&
          origin.startsWith('http://localhost:')
        ) {
          callback(null, true);
        } else {
          console.warn('[CORS] Rejected origin', {
            origin,
            allowedOrigins,
            nodeEnv: process.env.NODE_ENV,
          });
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Impersonate-User'],
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;
  const port = appConfig.port || 3000;

  setupSwagger(app);

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger UI available at: http://localhost:${port}/docs`);
}
bootstrap();
