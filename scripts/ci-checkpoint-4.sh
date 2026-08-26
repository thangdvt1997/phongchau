#!/bin/bash
set -e
cd /root/phongchau

echo "=== docker compose build (prod) ==="
docker compose -p phongchau -f docker-compose.prod.yml build

echo "=== docker compose up -d (prod) ==="
docker compose -p phongchau -f docker-compose.prod.yml up -d

echo "=== waiting for backend health ==="
for i in $(seq 1 60); do
  status=$(docker inspect --format='{{.State.Health.Status}}' phongchau-backend-1 2>/dev/null || echo "starting")
  echo "backend health: $status"
  if [ "$status" = "healthy" ]; then break; fi
  sleep 3
done

echo "=== running prisma migrate deploy against prod db ==="
docker compose -p phongchau -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

echo "=== containers status ==="
docker compose -p phongchau -f docker-compose.prod.yml ps
