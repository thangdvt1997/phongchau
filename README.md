# Phong Chau — Agriculture/Food B2B+B2C Commerce Platform

P0 MVP implementation. See `docs/Pormt.docx` / `docs/prompt-summary.pdf` for the full source spec
and `ROADMAP.md` for what's deliberately deferred to P1–P3.

## Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis
- **Infra**: Docker Compose, Nginx reverse proxy

## Local development

```bash
cp .env.example .env   # adjust secrets if needed
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api/v1, Swagger docs at http://localhost:4000/api/docs
- Adminer (DB UI): http://localhost:8081

Run migrations + seed data manually the first time (or whenever the schema changes):
```bash
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
```

Seeded accounts (see `backend/prisma/seed.ts`):
| Role | Email | Password |
|---|---|---|
| Super Admin | admin@phongchau.com | Admin@12345 |
| Sales | sales@phongchau.com | Sales@12345 |
| Retail customer | customer@phongchau.com | Customer@12345 |
| B2B customer (pre-approved) | b2b@phongchau.com | B2bCustomer@12345 |

## Tests

```bash
docker compose exec backend npm test          # unit tests
docker compose exec backend npm run test:e2e  # e2e tests (needs the dev stack running)
docker compose exec frontend npm test         # component tests
```

## Production deploy (Docker Compose)

```bash
cp .env.example .env   # fill in real secrets, PUBLIC_BASE_URL, NEXT_PUBLIC_API_BASE_URL
docker compose -f docker-compose.prod.yml up -d --build
```
Nginx listens on `NGINX_HTTP_PORT` (default `8730`) and routes `/api/*`, `/health`,
`/sitemap.xml`, `/robots.txt` to the backend and everything else to the frontend.

## Project layout
```
backend/   NestJS API (modular monolith — see module list in src/app.module.ts)
frontend/  Next.js site (public storefront + admin panel)
infra/     nginx config, deploy scripts
docs/      original requirement documents
```
