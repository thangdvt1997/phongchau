#!/bin/bash
set -e
cd /root/phongchau

echo "=== backend: unit tests ==="
docker run --rm -v /root/phongchau/backend:/app -w /app node:20-bookworm-slim bash -c "apt-get update -y >/dev/null 2>&1 && apt-get install -y openssl >/dev/null 2>&1 && npx prisma generate >/dev/null 2>&1 && npx jest --ci --silent=false"
