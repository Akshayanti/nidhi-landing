#!/bin/bash
# Turn a kit's rendered carousel slides into 9:16 story frames (one per slide) and a silent
# slideshow reel with slide-left transitions. First used for the Nov 1, 2026 volunteer call.
# Usage: scripts/slides-to-reel.sh <carousel dir> <out dir> ["<seconds per slide, space separated>"]
# Without the seconds it writes the stories only (as for Nov 1, whose reel is a text reel from render-text-reel.mjs).
# Writes <out>/stories/story-NN.png, <out>/reel/frames/frame-NN.png, <out>/reel/reel.mp4, <out>/reel/cover.png.
# Stories: card 1000 wide at y=290 (clear of the top bar and reply bar). Reel: card 900 wide, shifted
# left, so text stays clear of the action buttons on the right and the caption area at the bottom.
set -euo pipefail
IN="$1"; OUT="$2"; DURS=(${3:-})
BG="#FAF7F2"; FADE=0.4
mkdir -p "$OUT/stories"; [ ${#DURS[@]} -gt 0 ] && mkdir -p "$OUT/reel/frames"
card() { # slide, width, out
  local w=$2 h=$(( $2 * 5 / 4 ))
  magick "$1" -resize ${w}x${h} \
    \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 $((w-1)),$((h-1)) 28,28" \) -alpha off -compose CopyOpacity -composite "$3"
}
place() { # card, x, y, out: soft navy shadow drawn and blurred on the full canvas, so it is never clipped
  local w h; w=$(magick identify -format %w "$1"); h=$(magick identify -format %h "$1")
  magick -size 1080x1920 "xc:$BG"     \( -size 1080x1920 xc:none -fill "rgba(0,33,113,0.18)" -draw "roundrectangle $2,$(( $3 + 14 )) $(( $2 + w - 1 )),$(( $3 + h + 13 )) 28,28" -blur 0x18 \) -composite     "$1" -geometry +$2+$3 -composite -alpha off "$4"
}
i=0
for s in "$IN"/slide-0*.png; do
  i=$((i+1)); n=$(printf %02d $i)
  card "$s" 1000 "$OUT/tmp-story-card.png"; place "$OUT/tmp-story-card.png" 40 290 "$OUT/stories/story-$n.png"
  if [ ${#DURS[@]} -gt 0 ]; then card "$s" 900 "$OUT/tmp-reel-card.png"; place "$OUT/tmp-reel-card.png" 48 330 "$OUT/reel/frames/frame-$n.png"; fi
done
rm -f "$OUT"/tmp-*.png
[ ${#DURS[@]} -eq 0 ] && { echo "$i stories"; exit 0; }
# Slideshow with crossfades and a silent audio track.
args=(); filt=""; prev="0:v"; off=0
for ((k=0;k<i;k++)); do args+=(-loop 1 -t ${DURS[$k]} -i "$OUT/reel/frames/frame-$(printf %02d $((k+1))).png"); done
filt="[0:v]format=yuv420p,setsar=1[v0];"
for ((k=1;k<i;k++)); do filt+="[$k:v]format=yuv420p,setsar=1[s$k];"; done
acc=0; last="v0"
for ((k=1;k<i;k++)); do
  acc=$(echo "$acc + ${DURS[$((k-1))]} - $FADE" | bc)
  filt+="[$last][s$k]xfade=transition=slideleft:duration=$FADE:offset=$acc[x$k];"; last="x$k"
done
total=$(echo "$acc + ${DURS[$((i-1))]}" | bc)
ffmpeg -y -loglevel error "${args[@]}" -f lavfi -t "$total" -i anullsrc=r=44100:cl=stereo \
  -filter_complex "${filt%;}" -map "[$last]" -map "$i:a" -r 30 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 96k -shortest -movflags +faststart "$OUT/reel/reel.mp4"
cp "$OUT/reel/frames/frame-01.png" "$OUT/reel/cover.png"
echo "total ${total}s, $i slides"
