#!/bin/bash
set -e
cd /root/phongchau

echo "=== starting e2e postgres+redis ==="
docker rm -f phongchau_e2e_pg phongchau_e2e_redis >/dev/null 2>&1 || true
docker network rm phongchau_e2e_net >/dev/null 2>&1 || true
docker network create phongchau_e2e_net
docker run -d --name phongchau_e2e_pg --network phongchau_e2e_net \
  -e POSTGRES_USER=phongchau -e POSTGRES_PASSWORD=e2epass -e POSTGRES_DB=phongchau_e2e \
  postgres:16-alpine
docker run -d --name phongchau_e2e_redis --network phongchau_e2e_net redis:7-alpine

echo "=== waiting for postgres ==="
for i in $(seq 1 30); do
  docker exec phongchau_e2e_pg pg_isready -U phongchau >/dev/null 2>&1 && break
  sleep 1
done

echo "=== running e2e tests ==="
set +e
docker run --rm --network phongchau_e2e_net \
  -v /root/phongchau/backend:/app -w /app \
  -e DATABASE_URL="postgresql://phongchau:e2epass@phongchau_e2e_pg:5432/phongchau_e2e?schema=public" \
  -e REDIS_URL="redis://phongchau_e2e_redis:6379" \
  -e JWT_ACCESS_SECRET=test-access -e JWT_REFRESH_SECRET=test-refresh \
  -e JWT_ACCESS_TTL=15m -e JWT_REFRESH_TTL=7d -e NODE_ENV=test -e EMAIL_ENABLED=false \
  -e UPLOAD_DIR=/app/uploads -e PUBLIC_BASE_URL=http://localhost:4000 \
  node:20-bookworm-slim bash -c "apt-get update -y >/dev/null 2>&1 && apt-get install -y openssl >/dev/null 2>&1 && npx prisma generate >/dev/null 2>&1 && npx prisma migrate deploy && npm run prisma:seed && npx jest --config test/jest-e2e.json --ci --runInBand"

E2E_EXIT=$?
set -e

echo "=== cleaning up e2e containers ==="
docker rm -f phongchau_e2e_pg phongchau_e2e_redis >/dev/null 2>&1 || true
docker network rm phongchau_e2e_net >/dev/null 2>&1 || true

exit $E2E_EXIT
