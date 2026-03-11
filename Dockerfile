# Stage 1: Build llama.cpp
FROM alpine:3.19 AS llama-build
RUN apk add --no-cache build-base cmake git curl linux-headers
RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git /llama.cpp
WORKDIR /llama.cpp
RUN cmake -B build -DBUILD_SHARED_LIBS=OFF -DLLAMA_CURL=OFF && \
    cmake --build build --target llama-server -j$(nproc)

# Stage 2: Application
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache curl libstdc++ python3 make g++

# Install Chromium for admin bot
RUN apk add --no-cache chromium

ENV CHROME_PATH=/usr/bin/chromium-browser

# Copy llama-server binary from build stage
COPY --from=llama-build /llama.cpp/build/bin/llama-server /usr/local/bin/llama-server

WORKDIR /app

# Install all dependencies (including devDependencies — tsx is needed for db scripts)
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build Next.js
RUN npm run build

# Create data directory for SQLite database and model cache
RUN mkdir -p /app/data/models

EXPOSE 3000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
