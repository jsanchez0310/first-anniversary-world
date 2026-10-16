#!/usr/bin/env bash
set -e

# ==============================================================================
# encode-scrub-videos.sh
# Codificación especializada para Scrollytelling con Scrubbing Instantáneo a 60 FPS
# - Desktop: 2K (2560x1440) @ 60 FPS, GOP=6 (un keyframe cada 0.1s), 0 B-frames
# - Mobile: 1080p (1920x1080) @ 60 FPS, GOP=5 (un keyframe cada 0.08s), 0 B-frames
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/public"
DESKTOP_DIR="$PUBLIC_DIR/desktop"
MOBILE_DIR="$PUBLIC_DIR/mobile"

mkdir -p "$DESKTOP_DIR" "$MOBILE_DIR"

encode_video() {
  local src="$1"
  local base_name="$2"
  local has_audio="$3"

  local dest_desktop="$DESKTOP_DIR/${base_name}.mp4"
  local dest_mobile="$MOBILE_DIR/${base_name}.mp4"

  echo "=========================================================="
  echo "Procesando: $src -> ${base_name}.mp4"
  echo "=========================================================="

  # 1. Desktop: 2K 1440p @ 60 FPS
  echo "[1/2] Codificando Desktop 2K (1440p, 60fps, GOP=6)..."
  if [ "$has_audio" = "true" ]; then
    ffmpeg -y -i "$src" \
      -vf "scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:(ow-iw)/2:(oh-ih)/2" \
      -r 60 -c:v libx264 -preset veryfast -crf 20 \
      -g 6 -keyint_min 6 -sc_threshold 0 \
      -bf 0 -tune fastdecode -pix_fmt yuv420p \
      -c:a aac -b:a 128k \
      -movflags +faststart "$dest_desktop"
  else
    ffmpeg -y -i "$src" \
      -vf "scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:(ow-iw)/2:(oh-ih)/2" \
      -r 60 -c:v libx264 -preset veryfast -crf 20 \
      -g 6 -keyint_min 6 -sc_threshold 0 \
      -bf 0 -tune fastdecode -pix_fmt yuv420p \
      -an \
      -movflags +faststart "$dest_desktop"
  fi

  # 2. Mobile: 1080p @ 60 FPS
  echo "[2/2] Codificando Mobile 1080p (60fps, GOP=5)..."
  if [ "$has_audio" = "true" ]; then
    ffmpeg -y -i "$src" \
      -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
      -r 60 -c:v libx264 -preset veryfast -crf 22 \
      -g 5 -keyint_min 5 -sc_threshold 0 \
      -bf 0 -tune fastdecode -pix_fmt yuv420p \
      -c:a aac -b:a 96k \
      -movflags +faststart "$dest_mobile"
  else
    ffmpeg -y -i "$src" \
      -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
      -r 60 -c:v libx264 -preset veryfast -crf 22 \
      -g 5 -keyint_min 5 -sc_threshold 0 \
      -bf 0 -tune fastdecode -pix_fmt yuv420p \
      -an \
      -movflags +faststart "$dest_mobile"
  fi
}

echo "Iniciando codificación de videos para scrollytelling a 60 FPS..."

encode_video "$PUBLIC_DIR/initial_loop_video.webm" "initial_loop_video" "true"
encode_video "$PUBLIC_DIR/on_intro_start.webm" "on_intro_start" "true"
encode_video "$PUBLIC_DIR/world_1.webm" "world_1" "false"
encode_video "$PUBLIC_DIR/world_2.webm" "world_2" "false"
encode_video "$PUBLIC_DIR/world_3.mp4" "world_3" "false"

echo "¡Codificación completada exitosamente en public/desktop y public/mobile!"
