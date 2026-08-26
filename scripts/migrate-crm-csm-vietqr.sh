#!/bin/bash
set -e
cd /root/phongchau/backend

TS=$(date -u +%Y%m%d%H%M%S)
NAME="${TS}_crm_csm_vietqr"
MIGDIR="prisma/migrations/${NAME}"

DBURL="postgresql://phongchau:$(grep ^POSTGRES_PASSWORD ../.env | cut -d= -f2-)@localhost:5432/phongchau?schema=public"

docker run --rm --network phongchau_default \
  -v /root/phongchau/backend:/app -w /app \
  node:20-bookworm-slim bash -c "
    apt-get update -y >/dev/null 2>&1 && apt-get install -y openssl >/dev/null 2>&1
    mkdir -p '${MIGDIR}'
    npx prisma migrate diff \
      --from-url 'postgresql://phongchau:$(grep ^POSTGRES_PASSWORD ../.env | cut -d= -f2-)@phongchau-postgres-1:5432/phongchau?schema=public' \
      --to-schema-datamodel prisma/schema.prisma \
      --script > '${MIGDIR}/migration.sql'
  "

echo "=== generated migration ==="
cat "${MIGDIR}/migration.sql"
