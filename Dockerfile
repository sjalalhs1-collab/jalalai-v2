# JalalAI production image.
# Two-stage: compile TypeScript, then run on a slim image with the Python/LibreOffice
# toolchain that scripts_artifact_writer.py needs for DOCX/XLSX/PPTX/PDF generation.
# NOTE: written against the current single-process JSON-file identity store.
# If/when Gate A's Postgres migration lands, add `DATABASE_URL` here and drop the
# data/ volume mount for identity state (keep it only for generated artifacts).

FROM node:20-slim AS build
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install --no-save typescript@^5.9.0 \
 && npx tsc

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Python + LibreOffice for real Office artifact generation (docx/xlsx/pptx/pdf).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip libreoffice --no-install-recommends \
 && pip3 install --no-cache-dir --break-system-packages python-docx openpyxl python-pptx \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY public ./public
COPY scripts_artifact_writer.py ./
COPY package.json ./

# Runtime state (JSON identity store, generated artifacts). Mount this as a
# volume in production — the container filesystem is ephemeral otherwise.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8787
USER node
CMD ["node", "dist/api/server.js"]
