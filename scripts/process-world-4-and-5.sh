#!/usr/bin/env bash
set -e

# ==============================================================================
# process-world-4-and-5.sh
# Procesa world_4 y world_5:
# - Elimina fotogramas negros detectados en world_4 (frames 885-887 y 1247)
# - Convierte world_4 (HEVC) a H.264 con aceleración de hardware
# - Codifica world_4 y world_5 para Desktop (2K, 60fps, GOP=6, 0 B-frames)
# - Codifica world_4 y world_5 para Mobile (1080p, 60fps, GOP=5, 0 B-frames)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/public"
DESKTOP_DIR="$PUBLIC_DIR/desktop"
MOBILE_DIR="$PUBLIC_DIR/mobile"

mkdir -p "$DESKTOP_DIR" "$MOBILE_DIR"

echo "=== Procesando world_4.mp4 ==="

# 1. World 4 Desktop: 2K @ 60 FPS sin cuadros negros
echo "[1/4] Codificando Desktop world_4 (2K 1440p @ 60 FPS, GOP=6, eliminando cuadros negros)..."
ffmpeg -y -i "$PUBLIC_DIR/world_4.mp4" \
  -vf "select='not(between(n\,885\,887))*not(gte(n\,1247))',setpts=N/FRAME_RATE/TB,scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:(ow-iw)/2:(oh-ih)/2" \
  -r 60 -c:v libx264 -preset veryfast -crf 20 \
  -g 6 -keyint_min 6 -sc_threshold 0 \
  -bf 0 -tune fastdecode -pix_fmt yuv420p \
  -an -movflags +faststart "$DESKTOP_DIR/world_4.mp4"

# 2. World 4 Mobile: 1080p @ 60 FPS sin cuadros negros
echo "[2/4] Codificando Mobile world_4 (1080p @ 60 FPS, GOP=5, eliminando cuadros negros)..."
ffmpeg -y -i "$PUBLIC_DIR/world_4.mp4" \
  -vf "select='not(between(n\,885\,887))*not(gte(n\,1247))',setpts=N/FRAME_RATE/TB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 60 -c:v libx264 -preset veryfast -crf 22 \
  -g 5 -keyint_min 5 -sc_threshold 0 \
  -bf 0 -tune fastdecode -pix_fmt yuv420p \
  -an -movflags +faststart "$MOBILE_DIR/world_4.mp4"

echo "=== Procesando world_5.mp4 ==="

# 3. World 5 Desktop: 2K @ 60 FPS
echo "[3/4] Codificando Desktop world_5 (2K 1440p @ 60 FPS, GOP=6)..."
ffmpeg -y -i "$PUBLIC_DIR/world_5.mp4" \
  -vf "scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:(ow-iw)/2:(oh-ih)/2" \
  -r 60 -c:v libx264 -preset veryfast -crf 20 \
  -g 6 -keyint_min 6 -sc_threshold 0 \
  -bf 0 -tune fastdecode -pix_fmt yuv420p \
  -an -movflags +faststart "$DESKTOP_DIR/world_5.mp4"

# 4. World 5 Mobile: 1080p @ 60 FPS
echo "[4/4] Codificando Mobile world_5 (1080p @ 60 FPS, GOP=5)..."
ffmpeg -y -i "$PUBLIC_DIR/world_5.mp4" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 60 -c:v libx264 -preset veryfast -crf 22 \
  -g 5 -keyint_min 5 -sc_threshold 0 \
  -bf 0 -tune fastdecode -pix_fmt yuv420p \
  -an -movflags +faststart "$MOBILE_DIR/world_5.mp4"

echo "¡World 4 y World 5 procesados exitosamente!"
