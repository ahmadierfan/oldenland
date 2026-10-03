#!/usr/bin/env bash
# Builds web-ready media from media/source into public/.
#   - Unboxing video  -> WebP frame sequences (desktop + mobile) for the scroll-scrubbed canvas
#   - Product photos  -> graded, auto-oriented WebP at two widths
# Requires: ffmpeg (with libwebp), ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=media/source
FPS=${FPS:-8}
# Stop on the hero shot of the saffron vessel (the tail of the clip shows the empty case).
MAX_FRAMES=${MAX_FRAMES:-365}
# Low-key "luxury" grade: pull the white wall and carpet down, keep kraft/violet/saffron rich, bake in a vignette.
GRADE="eq=contrast=1.1:saturation=1.15:gamma=0.92,curves=all='0/0 0.3/0.24 0.65/0.56 1/0.78':r='0/0 0.5/0.53 1/1':b='0/0 0.5/0.46 1/0.94',vignette=angle=PI/3.2"
# The first part of the clip is letterboxed; trim the bars from every frame.
CROP="crop=1080:1900:0:61"

frames() {
  local name=$1 width=$2 q=$3
  local out=public/frames/$name
  rm -rf "$out" && mkdir -p "$out"
  ffmpeg -loglevel error -y -i "$SRC/video.mp4" \
    -vf "fps=$FPS,$CROP,$GRADE,scale=$width:-2:flags=lanczos" \
    -frames:v "$MAX_FRAMES" -c:v libwebp -quality "$q" -compression_level 6 -start_number 0 "$out/%04d.webp"
  echo "$name: $(ls "$out" | wc -l) frames, $(du -sh "$out" | cut -f1)"
}

[ -n "${SKIP_FRAMES:-}" ] || frames lg 720 64
[ -n "${SKIP_FRAMES:-}" ] || frames sm 432 60

# Photos: name=source
declare -A PHOTOS=(
  [bag]=IMG_9289 [bag-inside]=IMG_9290 [bag-angle]=IMG_9292
  [giftbox]=IMG_9277 [giftbox-reveal]=IMG_9278 [emblem]=IMG_9288
  [cases-open]=IMG_9279 [inner-case]=IMG_9281 [case-tilt]=IMG_9283
  [vessel-crown]=IMG_9274 [crocus-stopper]=IMG_9275 [vessel-duo]=IMG_9273
  [saffron-macro]=IMG_9276 [saffron-crown]=IMG_9287
  [story-card]=IMG_9284 [story-letter]=IMG_9286
)
mkdir -p public/images
for name in "${!PHOTOS[@]}"; do
  src="$SRC/${PHOTOS[$name]}.jpeg"
  for w in 1600 800; do
    convert "$src" -auto-orient -resize "${w}x${w}>" \
      -modulate 96,114,100 -sigmoidal-contrast 3x45% +level 0%,86% -gamma 0.94 \
      -quality 72 -define webp:method=6 "public/images/$name-$w.webp"
  done
done
echo "images: $(ls public/images | wc -l) files, $(du -sh public/images | cut -f1)"
