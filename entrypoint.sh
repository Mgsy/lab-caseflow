#!/bin/sh
set -e

MODEL_DIR="/app/data/models"
MODEL_FILE="$MODEL_DIR/qwen2.5-0.5b-instruct-q4_k_m.gguf"
MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"

# Ensure model directory exists (volume mount overwrites image dirs)
mkdir -p "$MODEL_DIR"

# Download model if not cached
if [ ! -f "$MODEL_FILE" ]; then
  echo "[CaseflowAI] Downloading Qwen2.5-0.5B (~400MB, one-time)..."
  curl -L -o "$MODEL_FILE" "$MODEL_URL"
  echo "[CaseflowAI] Model downloaded."
else
  echo "[CaseflowAI] Model already cached."
fi

# Start llama-server in background
echo "[CaseflowAI] Starting llama-server..."
llama-server \
  --model "$MODEL_FILE" \
  --host 127.0.0.1 \
  --port 8080 \
  --ctx-size 2048 \
  --threads $(nproc) \
  --log-disable \
  &

# Wait for llama-server to be ready
echo "[CaseflowAI] Waiting for llama-server..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8080/health > /dev/null 2>&1; then
    echo "[CaseflowAI] llama-server ready."
    break
  fi
  sleep 1
done

# Run DB migrations and seed for all tenants
for TENANT in acmecorp attacker; do
  echo "[caseflow] Migrating $TENANT..."
  TENANT=$TENANT npm run db:migrate

  USER_COUNT=$(node -e "
    const Database = require('better-sqlite3');
    const db = new Database('/app/data/${TENANT}.db');
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(row.count);
    db.close();
  " 2>/dev/null || echo "0")

  if [ "$USER_COUNT" = "0" ]; then
    echo "[caseflow] Seeding $TENANT..."
    TENANT=$TENANT npm run db:seed
  else
    echo "[caseflow] $TENANT already seeded ($USER_COUNT users found), skipping."
  fi
done

echo "[caseflow] Starting Next.js server..."
# Start Next.js in background
npm start &
NEXT_PID=$!

# Wait for Next.js to be ready
echo "[caseflow] Waiting for Next.js..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "[caseflow] Next.js ready."
    break
  fi
  sleep 1
done

# Start admin bot (acmecorp only)
echo "[caseflow] Starting admin bot..."
node /app/bot/admin-bot.js &
BOT_PID=$!

# Wait for Next.js process
wait $NEXT_PID
