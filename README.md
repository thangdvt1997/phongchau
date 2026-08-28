# Phong Chau — Agriculture/Food B2B+B2C Commerce Platform

Full B2C+B2B commerce platform — catalog, cart, checkout, orders, RFQ, B2B tier/contract pricing,
OEM/ODM workflow, WMS, CRM, customer support ticketing, marketing automation, multi-currency
display, VietQR payment, CMS blog, SEO, and an admin panel with RBAC. See `docs/Pormt.docx` /
`docs/prompt-summary.pdf` for the full source spec and `ROADMAP.md` for what's done vs. still
deferred (P3 marketplace/AI/ERP integrations, live carrier APIs, real payment gateway keys).

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

Seeding creates one demo account per role (Super Admin, Sales, Retail customer, pre-approved B2B
customer) — see `backend/prisma/seed.ts` for the actual emails/passwords rather than duplicating
credentials here.

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
scripts/   CI checkpoint scripts, prod nginx configs, one-off migration/seed helpers
docs/      original requirement documents
```
