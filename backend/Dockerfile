FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
RUN mkdir -p /app/uploads
# Set AFTER install/build — devDependencies (typescript, prisma CLI, ts-node for seeding) must
# stay installed and resolvable; NODE_ENV=production here only affects runtime behavior.
ENV NODE_ENV=production
EXPOSE 4000
# Seed is idempotent (upsert / find-or-create throughout), safe to run on every start.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed; node dist/main.js"]
