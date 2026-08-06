FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5000
# NODE_ENV is intentionally NOT set here: the app runs via tsx (a devDependency),
# so npm ci must install devDeps. Set NODE_ENV=production as a Tower env var.
CMD ["npx", "tsx", "src/server.ts"]
