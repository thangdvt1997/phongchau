#!/bin/bash
set -e
cd /root/phongchau
echo "=== extracting sync archive ==="
mkdir -p /root/phongchau_new
tar -xzf /root/phongchau_sync2.tar.gz -C /root/phongchau_new
rsync -a --delete --exclude node_modules --exclude .git --exclude .next --exclude dist --exclude backend/uploads /root/phongchau_new/ /root/phongchau/
rm -rf /root/phongchau_new /root/phongchau_sync2.tar.gz

echo "=== backend: npm install ==="
docker run --rm -v /root/phongchau/backend:/app -w /app node:20-bookworm-slim npm install

echo "=== backend: prisma generate ==="
docker run --rm -v /root/phongchau/backend:/app -w /app node:20-bookworm-slim npx prisma generate

echo "=== backend: tsc --noEmit ==="
docker run --rm -v /root/phongchau/backend:/app -w /app node:20-bookworm-slim npx tsc --noEmit -p tsconfig.json

echo "=== frontend: npm install ==="
docker run --rm -v /root/phongchau/frontend:/app -w /app node:20-bookworm-slim npm install

echo "=== frontend: tsc --noEmit ==="
docker run --rm -v /root/phongchau/frontend:/app -w /app node:20-bookworm-slim npx tsc --noEmit

echo "=== ALL TSC CHECKS PASSED ==="
