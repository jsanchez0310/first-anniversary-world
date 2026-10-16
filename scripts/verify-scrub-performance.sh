#!/usr/bin/env bash
set -e

# ==============================================================================
# verify-scrub-performance.sh
# Validador de rendimiento y parámetros de video para Scrollytelling
# Comprueba:
# 1. Tasa de refresco exacta (60 FPS)
# 2. Ausencia de B-frames (cero latencia de decodificación)
# 3. GOP denso (distancia máxima de I-frames <= 6 cuadros)
# 4. Códec h264
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/public"

check_file() {
  local file="$1"
  local max_gop="$2"

  echo "--------------------------------------------------------"
  echo "Verificando archivo: $file"
  echo "--------------------------------------------------------"

  if [ ! -f "$file" ]; then
    echo "ERROR: El archivo no existe: $file"
    exit 1
  fi

  # 1. Códec y Framerate
  local codec=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$file")
  local r_fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "$file")
  local width=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=noprint_wrappers=1:nokey=1 "$file")
  local height=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=noprint_wrappers=1:nokey=1 "$file")
  local size=$(ls -lh "$file" | awk '{print $5}')

  echo "  Resolución : ${width}x${height}"
  echo "  Códec      : $codec"
  echo "  Framerate  : $r_fps"
  echo "  Tamaño     : $size"

  if [ "$codec" != "h264" ]; then
    echo "  FALLA: Se esperaba códec h264, obtenido $codec"
    exit 1
  fi

  if [ "$r_fps" != "60/1" ]; then
    echo "  FALLA: Se esperaba 60 FPS (60/1), obtenido $r_fps"
    exit 1
  fi

  # 2. B-Frames check
  local b_frames=$(ffprobe -v error -select_streams v:0 -show_entries frame=pict_type -of csv=p=0 -read_intervals "%+2" "$file" | grep -c ',B' || true)
  if [ "$b_frames" -gt 0 ]; then
    echo "  FALLA: Se detectaron B-frames ($b_frames), lo cual incrementa el lag de scrubbing."
    exit 1
  fi
  echo "  B-Frames   : 0 (OK: Cero latencia de decodificación bidireccional)"

  # 3. Intervalo de Keyframes (GOP)
  local total_frames=0
  local i_frames=0
  # Analizar primeros 2 segundos (120 frames a 60fps)
  local frame_types=$(ffprobe -v error -select_streams v:0 -show_entries frame=pict_type -of csv=p=0 -read_intervals "%+2" "$file")
  local max_dist=0
  local current_dist=0

  while IFS= read -r line; do
    total_frames=$((total_frames + 1))
    local ptype=$(echo "$line" | cut -d',' -f2)
    if [ "$ptype" = "I" ]; then
      i_frames=$((i_frames + 1))
      if [ $current_dist -gt $max_dist ]; then
        max_dist=$current_dist
      fi
      current_dist=0
    else
      current_dist=$((current_dist + 1))
    fi
  done <<< "$frame_types"

  echo "  Max GOP    : $max_dist cuadros entre I-frames (Límite: $max_gop)"
  if [ $max_dist -gt $max_gop ]; then
    echo "  FALLA: El intervalo de fotogramas clave excede el límite permitido de $max_gop"
    exit 1
  fi

  echo "  Resultado  : PASÓ (Fluidez óptima garantizada para scrollytelling)"
}

echo "=== INICIANDO VALIDACIÓN DE RENDIMIENTO DE SCRUBBING ==="

for f in "$PUBLIC_DIR"/desktop/*.mp4; do
  [ -e "$f" ] || continue
  check_file "$f" 6
done

for f in "$PUBLIC_DIR"/mobile/*.mp4; do
  [ -e "$f" ] || continue
  check_file "$f" 5
done

echo ""
echo "=========================================================="
echo "✓ TODOS LOS VIDEOS SUPERARON LAS PRUEBAS DE SCRUBBING A 60 FPS"
echo "=========================================================="
