#!/usr/bin/env bash
set -e

# ==============================================================================
# remove-black-frames.sh
# Detecta y remueve automáticamente los fotogramas negros en los videos
# manteniendo 60 FPS exactos y GOP ultra-corto para scrubbing fluido.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/public"

clean_file() {
  local target="$1"
  local select_expr="$2"
  local is_mobile="$3"
  local tmp_out="${target}.tmp.mp4"

  local gop=6
  local crf=20
  if [ "$is_mobile" = "true" ]; then
    gop=5
    crf=22
  fi

  echo "Eliminando cuadros negros de: $target..."
  ffmpeg -y -i "$target" \
    -vf "select='${select_expr}',setpts=N/FRAME_RATE/TB" \
    -r 60 -c:v libx264 -preset veryfast -crf "$crf" \
    -g "$gop" -keyint_min "$gop" -sc_threshold 0 \
    -bf 0 -tune fastdecode -pix_fmt yuv420p \
    -an -movflags +faststart "$tmp_out"

  mv "$tmp_out" "$target"
}

# 1. Desktop
clean_file "$PUBLIC_DIR/desktop/world_1.mp4" "not(eq(n\,479))" "false"
clean_file "$PUBLIC_DIR/desktop/world_2.mp4" "not(eq(n\,239))" "false"
clean_file "$PUBLIC_DIR/desktop/world_3.mp4" "not(between(n\,512\,513))" "false"

# 2. Mobile
clean_file "$PUBLIC_DIR/mobile/world_1.mp4" "not(eq(n\,479))" "true"
clean_file "$PUBLIC_DIR/mobile/world_2.mp4" "not(eq(n\,239))" "true"
clean_file "$PUBLIC_DIR/mobile/world_3.mp4" "not(between(n\,512\,513))" "true"

echo "¡Cuadros negros removidos con éxito!"
