import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

/**
 * Boots a full Nest application (real Postgres via PrismaService, whatever
 * DATABASE_URL is set in the environment) with the exact same global setup as
 * backend/src/main.ts: global validation pipe, global prefix (excluding
 * health/sitemap.xml/robots.txt), and the HttpExceptionFilter.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'sitemap.xml', 'robots.txt'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return app;
}

/** Builds a unique, collision-free email for data created during a test run. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/** Builds a unique-ish string suffix for other unique fields (taxId, names, etc). */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const API_PREFIX = '/api/v1';
