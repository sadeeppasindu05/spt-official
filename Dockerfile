FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx vite build && npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "dist/server.cjs"]
