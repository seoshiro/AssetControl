FROM node:18-slim

# Устанавливаем openssl (для Prisma) и postgresql-client (для pg_dump)
RUN apt-get update -y && apt-get install -y openssl postgresql-client


WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5847

# Start script: run migrations, seed, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"]
