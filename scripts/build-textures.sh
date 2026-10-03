#!/usr/bin/env bash
# Builds the 3D scene textures from the reference photos in media/source.
#   - public/textures/kraft.jpg   : kraft paper, lighting flattened (from the gift-box lid, IMG_9288)
#   - public/textures/emblem.svg  : the violet die-cut emblem + "OLDEN LAND" wordmark, vectorised
# Requires: ImageMagick, potrace, python3.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=media/source
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p public/textures

# Kraft paper
convert "$SRC/IMG_9288.jpeg" -auto-orient -crop 900x880+560+660 +repage "$TMP/kraft_raw.png"
convert "$TMP/kraft_raw.png" \( +clone -blur 0x250 \) -compose Divide_Src -composite \
  \( +clone -fill "srgb(78%,65.5%,40.3%)" -colorize 100 \) -compose Multiply -composite \
  -modulate 100,92 -sigmoidal-contrast 3x50% -resize 1024x1024! -quality 86 public/textures/kraft.jpg

# Emblem (lid is photographed on its side: rotate upright)
convert "$SRC/IMG_9288.jpeg" -auto-orient -crop 1300x800+850+1450 +repage -rotate 90 "$TMP/emb.png"
convert "$TMP/emb.png" -colorspace sRGB -fx "(b-g>0.1 && b>0.2)?0:1" -blur 0x2 -threshold 55% \
  -morphology Close Disk:1 "$TMP/violet.pbm"
convert "$TMP/emb.png" -colorspace sRGB -fx "(lightness<0.3 && !(b-g>0.12))?0:1" -threshold 50% "$TMP/dark.png"
convert -size 800x1300 xc:white \( "$TMP/dark.png" -crop 240x150+115+1055 +repage \) -geometry +115+1055 \
  -composite -blur 0x0.8 -threshold 50% "$TMP/text.pbm"
potrace "$TMP/violet.pbm" -s -o "$TMP/violet.svg" --turdsize 60 --alphamax 1.2 --opttolerance 0.5
potrace "$TMP/text.pbm" -s -o "$TMP/text.svg" --turdsize 15 --alphamax 0.9
python3 - "$TMP" <<'PY'
import re, sys
tmp = sys.argv[1]
def g(f):
    s = open(f).read()
    m = re.search(r'<g transform="([^"]+)"[^>]*>(.*?)</g>', s, re.S)
    return m.group(1), m.group(2)
t1, v = g(f"{tmp}/violet.svg"); t2, t = g(f"{tmp}/text.svg")
open("public/textures/emblem.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1300">\n'
    f'<g transform="{t1}" fill="#6a3db8">{v}</g>\n<g transform="{t2}" fill="#2a1f14">{t}</g>\n</svg>\n')
PY
echo "textures: $(ls public/textures)"
