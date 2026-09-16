FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
COPY tests ./tests
COPY public ./public
COPY data ./data
COPY docs ./docs
COPY *.md *.txt ./
RUN npm install --ignore-scripts && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data
EXPOSE 8787
CMD ["node", "dist/api/server.js"]
