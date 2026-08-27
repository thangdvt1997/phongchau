#!/bin/bash
set -e
cd /root/phongchau/backend

DBPASS=$(grep ^POSTGRES_PASSWORD ../.env | cut -d= -f2-)
DBURL="postgresql://phongchau:${DBPASS}@phongchau-postgres-1:5432/phongchau?schema=public"

docker run --rm --network phongchau_default \
  -v /root/phongchau/backend:/app -w /app \
  -v phongchau_phongchau_uploads:/app/uploads \
  -e DATABASE_URL="${DBURL}" \
  -e UPLOAD_DIR=/app/uploads \
  -e PUBLIC_BASE_URL="http://37.49.225.142:8730" \
  -e RESYNC_IMAGES_AND_PRICES=true \
  node:20-bookworm-slim bash -c "
    apt-get update -y >/dev/null 2>&1 && apt-get install -y openssl >/dev/null 2>&1
    npx prisma generate >/dev/null 2>&1
    npm run prisma:seed
  "
