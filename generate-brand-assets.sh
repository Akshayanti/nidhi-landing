#!/bin/bash

# Generate all nidhi brand assets from an SVG file
# Usage: ./generate-brand-assets.sh path/to/icon.svg
#
# Design principles:
#   - Single source of truth: the input SVG (e.g. public/test/favicon.svg)
#   - Text is measured first, then canvas is sized to fit. No clipping.
#   - All size variants are produced by scaling one high-resolution master
#     so proportions are identical across sizes.

set -e

SVG_PATH="$1"

if [ -z "$SVG_PATH" ]; then
    echo "Usage: $0 <path/to/icon.svg>"
    echo "Example: $0 public/test/favicon.svg"
    exit 1
fi

if [ ! -f "$SVG_PATH" ]; then
    echo "Error: File not found: $SVG_PATH"
    exit 1
fi

OUTPUT_DIR=$(dirname "$SVG_PATH")
BRAND_DIR="$OUTPUT_DIR/brand"
TEMP_DIR="$BRAND_DIR/.tmp"

# Color constants. Mirrors src/styles/global.css and src/styles/palette.ts —
# update all three together if the brand palette changes.
#
# Palette identities (from docs/color-palette.md):
PALETTE_BLUE="#0A3D8F"          # palette blue (light-mode primary)
PALETTE_BLUE_DARK="#90CAF9"     # palette blue dark (dark-mode primary)
PALETTE_TEAL="#005B4F"          # palette teal (light-mode dot, dark-mode accent)
PALETTE_TEAL_DARK="#80CBC4"     # palette teal dark (light-mode accent dot)
#
# Neutrals:
NEUTRAL_WHITE="#FFFFFF"
NEUTRAL_OFF_WHITE="#F8F9FA"     # site --color-bg in light mode
NEUTRAL_PAGE_BG_DARK="#121212"  # site --color-bg in dark mode
#
# Logo color flip across modes (palette-only, AA-compliant):
#   Light: bg=PALETTE_BLUE      strokes=NEUTRAL_WHITE  dot=PALETTE_TEAL_DARK
#   Dark:  bg=PALETTE_BLUE_DARK strokes=PALETTE_BLUE   dot=PALETTE_TEAL
#
# Aliases retained so the rest of the script reads naturally.
PRIMARY_BLUE="$PALETTE_BLUE"
PRIMARY_BLUE_LIGHT="$PALETTE_BLUE_DARK"
TEAL="$PALETTE_TEAL"
TEAL_LIGHT="$PALETTE_TEAL_DARK"
WHITE="$NEUTRAL_WHITE"
LIGHT_BG="$NEUTRAL_OFF_WHITE"
DARK_BG="$NEUTRAL_PAGE_BG_DARK"

BRAND_NAME="nidhi"
TAGLINE="Money, understood"

echo "=============================================="
echo "  nidhi Brand Asset Generator"
echo "=============================================="
echo ""

# ImageMagick detection
if command -v magick &> /dev/null; then
    IM_CONVERT="magick"
elif command -v convert &> /dev/null; then
    IM_CONVERT="convert"
else
    echo "Error: ImageMagick is required. Install with: brew install imagemagick"
    exit 1
fi

mkdir -p "$BRAND_DIR"/{favicons,logo/{full,icon-only},social} "$TEMP_DIR"

# Fonts: Inter Bold for wordmark, Inter Regular for tagline (single-family lockup)
INTER_BOLD="$HOME/Library/Fonts/Inter-Bold.otf"
INTER_REGULAR="$HOME/Library/Fonts/Inter-Regular.otf"
TAGLINE_FONT="$INTER_REGULAR"

for f in "$INTER_BOLD" "$INTER_REGULAR"; do
    if [ ! -f "$f" ]; then
        echo "Error: required font not found: $f"
        echo "Install with: brew install --cask font-inter"
        exit 1
    fi
done
echo "Fonts: Inter Bold (wordmark) + Inter Regular (tagline)"

# Rasterize SVG to PNG at a given size
convert_svg() {
    local input="$1" size="$2" output="$3"
    if command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w "$size" -h "$size" "$input" > "$output"
    elif command -v inkscape &> /dev/null; then
        inkscape "$input" --export-width="$size" --export-height="$size" \
            --export-filename="$output" 2>/dev/null
    else
        $IM_CONVERT -background none "$input" -resize "${size}x${size}" "$output"
    fi
}

# ============================================================================
# Favicons
# ============================================================================
echo ""
echo "Generating favicons..."
for size in 16 32; do
    convert_svg "$SVG_PATH" "$size" "$BRAND_DIR/favicons/favicon-${size}.png"
done
convert_svg "$SVG_PATH" 180 "$BRAND_DIR/favicons/apple-touch-icon.png"
for size in 192 512; do
    convert_svg "$SVG_PATH" "$size" "$BRAND_DIR/favicons/android-chrome-${size}x${size}.png"
done
convert_svg "$SVG_PATH" 150 "$BRAND_DIR/favicons/mstile-150x150.png"
$IM_CONVERT "$BRAND_DIR/favicons/favicon-16.png" "$BRAND_DIR/favicons/favicon-32.png" \
    "$BRAND_DIR/favicons/favicon.ico" 2>/dev/null || \
    cp "$BRAND_DIR/favicons/favicon-32.png" "$BRAND_DIR/favicons/favicon.ico"

# ============================================================================
# Icon-only (light & dark variants at multiple sizes)
# ============================================================================
echo "Generating icon-only assets..."
for size in 48 128 256 512 1024; do
    # Light mode: straight from SVG
    convert_svg "$SVG_PATH" "$size" "$BRAND_DIR/logo/icon-only/icon-${size}.png"

    # Dark mode: flip three palette colors. Order matters — bg flips before
    # strokes so the new stroke color (PRIMARY_BLUE) isn't caught by the
    # bg remap. Dot flips first (independent color, no collisions).
    #   dot  #80CBC4 -> #005B4F   (TEAL_LIGHT  -> TEAL)
    #   bg   #0A3D8F -> #90CAF9   (PRIMARY_BLUE -> PRIMARY_BLUE_LIGHT)
    #   line #FFFFFF -> #0A3D8F   (WHITE       -> PRIMARY_BLUE)
    $IM_CONVERT "$BRAND_DIR/logo/icon-only/icon-${size}.png" \
        -fuzz 10% -fill "$TEAL"               -opaque "$TEAL_LIGHT" \
        -fuzz 15% -fill "$PRIMARY_BLUE_LIGHT" -opaque "$PRIMARY_BLUE" \
        -fuzz 5%  -fill "$PRIMARY_BLUE"       -opaque "$WHITE" \
        -define png:color-type=6 \
        "$BRAND_DIR/logo/icon-only/icon-${size}-dark.png"
done

# Also create an "inner-only" icon (no rounded-square background) for use in
# circular avatars and compositions. We strip the rounded-square <rect class="bg"/>
# (or its fill="#0A3D8F" inline form) and rasterize the rest on a transparent canvas.
sed -E '/<rect[^>]*(class="bg"|fill="#0[Aa]3[Dd]8[Ff]")[^>]*\/>/d' "$SVG_PATH" > "$TEMP_DIR/icon-inner.svg"
convert_svg "$TEMP_DIR/icon-inner.svg" 1024 "$TEMP_DIR/icon-inner-1024.png"
# Inner-on-dark variant. The dark profile picture sits the inner on a
# PRIMARY_BLUE_LIGHT (#90CAF9) circle to mirror the dark-mode logo identity,
# so the strokes flip to PRIMARY_BLUE (#0A3D8F, 5.78:1 on #90CAF9) and the
# dot flips to TEAL (#005B4F, 4.60:1 on #90CAF9). Both pass AA non-text.
# Order: dot first (no collision), then strokes (white -> deep-blue) last.
$IM_CONVERT "$TEMP_DIR/icon-inner-1024.png" \
    -fuzz 10% -fill "$TEAL"         -opaque "$TEAL_LIGHT" \
    -fuzz 5%  -fill "$PRIMARY_BLUE" -opaque "$WHITE" \
    -define png:color-type=6 \
    "$TEMP_DIR/icon-inner-1024-dark.png"

# ============================================================================
# Full-logo master (built once at high resolution, then scaled to all sizes)
# ============================================================================
echo "Generating full logos..."

# Build a master composition for a given color scheme.
# Arguments:
#   $1 bg           — "$LIGHT_BG" | "$DARK_BG" | "transparent"
#   $2 wordmark_col — color for "nidhi"
#   $3 tagline_col  — color for tagline
#   $4 out_path     — output PNG path for the master
build_master_logo() {
    local bg="$1" wordmark_col="$2" tagline_col="$3" out="$4"

    # Design resolution (large so downscales are clean)
    local brand_pt=260
    local tagline_pt=96
    local icon_size=420
    local outer_margin=96
    local icon_gap=72
    local line_gap=16

    # Pick icon: dark variant when wordmark is light blue
    local icon="$BRAND_DIR/logo/icon-only/icon-1024.png"
    [[ "$wordmark_col" == "$PRIMARY_BLUE_LIGHT" ]] && \
        icon="$BRAND_DIR/logo/icon-only/icon-1024-dark.png"

    # 1. Render text labels at natural width — no -size constraint -> no clipping
    $IM_CONVERT -background transparent \
        -font "$INTER_BOLD" -pointsize "$brand_pt" \
        -fill "$wordmark_col" \
        -kerning -4 \
        label:"$BRAND_NAME" "PNG32:$TEMP_DIR/m-brand.png"

    $IM_CONVERT -background transparent \
        -font "$TAGLINE_FONT" -pointsize "$tagline_pt" \
        -fill "$tagline_col" \
        label:"$TAGLINE" "PNG32:$TEMP_DIR/m-tagline.png"

    # 2. Measure
    local bw bh tw th
    bw=$($IM_CONVERT "$TEMP_DIR/m-brand.png" -format "%w" info:)
    bh=$($IM_CONVERT "$TEMP_DIR/m-brand.png" -format "%h" info:)
    tw=$($IM_CONVERT "$TEMP_DIR/m-tagline.png" -format "%w" info:)
    th=$($IM_CONVERT "$TEMP_DIR/m-tagline.png" -format "%h" info:)

    # Text block = wordmark stacked over tagline (left aligned)
    local text_w=$(( bw > tw ? bw : tw ))
    local text_h=$(( bh + line_gap + th ))

    # 3. Compute canvas
    local content_h=$(( icon_size > text_h ? icon_size : text_h ))
    local total_w=$(( outer_margin + icon_size + icon_gap + text_w + outer_margin ))
    local total_h=$(( outer_margin + content_h + outer_margin ))

    # 4. Build canvas
    if [ "$bg" = "transparent" ]; then
        $IM_CONVERT -size "${total_w}x${total_h}" xc:transparent "PNG32:$TEMP_DIR/m-canvas.png"
    else
        $IM_CONVERT -size "${total_w}x${total_h}" "xc:$bg" "PNG32:$TEMP_DIR/m-canvas.png"
    fi

    # 5. Position elements (vertically centered along the taller of icon/text)
    local icon_x=$outer_margin
    local icon_y=$(( outer_margin + (content_h - icon_size) / 2 ))
    local text_x=$(( outer_margin + icon_size + icon_gap ))
    local text_y=$(( outer_margin + (content_h - text_h) / 2 ))
    local brand_y=$text_y
    # Align brand baseline with the optical center; tagline sits under it
    local tagline_y=$(( text_y + bh + line_gap ))

    # 6. Composite
    $IM_CONVERT "$icon" -resize "${icon_size}x${icon_size}" "PNG32:$TEMP_DIR/m-icon.png"
    $IM_CONVERT "$TEMP_DIR/m-canvas.png" \
        "$TEMP_DIR/m-icon.png"    -geometry "+${icon_x}+${icon_y}"    -composite \
        "$TEMP_DIR/m-brand.png"   -geometry "+${text_x}+${brand_y}"   -composite \
        "$TEMP_DIR/m-tagline.png" -geometry "+${text_x}+${tagline_y}" -composite \
        "PNG32:$out"
}

# Resize the master to each requested width, preserving aspect ratio.
emit_logo_variants() {
    local master="$1" variant_suffix="$2" is_transparent="$3"
    local widths=(300 400 600 800 1200)
    for w in "${widths[@]}"; do
        local out="$BRAND_DIR/logo/full/logo-full-${w}${variant_suffix}.png"
        if [ "$is_transparent" = "yes" ]; then
            $IM_CONVERT "$master" -resize "${w}x" "PNG32:$out"
        else
            $IM_CONVERT "$master" -resize "${w}x" "$out"
        fi
        echo "  logo-full-${w}${variant_suffix}.png"
    done
}

# Light (wordmark = primary blue on light bg; tagline = teal)
build_master_logo "$LIGHT_BG" "$PRIMARY_BLUE" "$TEAL" "$TEMP_DIR/master-light.png"
emit_logo_variants "$TEMP_DIR/master-light.png" "-light" "no"

# Dark (wordmark = primary blue light on dark bg; tagline = teal light)
build_master_logo "$DARK_BG" "$PRIMARY_BLUE_LIGHT" "$TEAL_LIGHT" "$TEMP_DIR/master-dark.png"
emit_logo_variants "$TEMP_DIR/master-dark.png" "-dark" "no"

# Transparent on-light (for placement on light-ish backgrounds)
build_master_logo "transparent" "$PRIMARY_BLUE" "$TEAL" "$TEMP_DIR/master-transparent.png"
for w in 400 800; do
    $IM_CONVERT "$TEMP_DIR/master-transparent.png" -resize "${w}x" \
        "PNG32:$BRAND_DIR/logo/full/logo-full-${w}-transparent.png"
    echo "  logo-full-${w}-transparent.png"
done

# Transparent on-dark
build_master_logo "transparent" "$PRIMARY_BLUE_LIGHT" "$TEAL_LIGHT" "$TEMP_DIR/master-transparent-dark.png"
for w in 400 800; do
    $IM_CONVERT "$TEMP_DIR/master-transparent-dark.png" -resize "${w}x" \
        "PNG32:$BRAND_DIR/logo/full/logo-full-${w}-transparent-dark.png"
    echo "  logo-full-${w}-transparent-dark.png"
done

# ============================================================================
# Social assets (OG, Facebook cover, LinkedIn banner, profile picture)
#   — Instagram and Twitter assets removed by design —
# ============================================================================
echo "Generating social media assets..."

# Build a soft drop-shadow for a transparent PNG element.
#   $1 input-png, $2 output-png, $3 opacity (0-100), $4 sigma (blur radius),
#   $5 offset-y (px)
# Approximates the brand elevation system:
#   level 1 (subtle)     ~ opacity 8,  sigma 3, offset 2
#   level 2 (cards)      ~ opacity 12, sigma 5, offset 4
#   level 3 (elevated)   ~ opacity 16, sigma 8, offset 8
make_shadow() {
    local input="$1" output="$2" opacity="$3" sigma="$4" offset_y="$5"

    # Create a shadow layer: the element silhouette, black, blurred, offset.
    # -shadow expects "OPACITYxSIGMA+X+Y". We render only the shadow then
    # composite the original PNG on top (so the element stays crisp).
    $IM_CONVERT "$input" \
        \( +clone -background black -shadow "${opacity}x${sigma}+0+${offset_y}" \) \
        +swap \
        -background none -layers merge +repage \
        "PNG32:$output"
}

# Helper: place the full-logo master, fitted within a target box, centered on
# a solid background, with a subtle elevation shadow (level 2) beneath.
# The shadow is applied to the composed element — the logo artwork itself
# remains flat (brand rule: no effects on the logo).
compose_social() {
    local master="$1" bg_color="$2" canvas_w="$3" canvas_h="$4" \
          logo_max_w="$5" logo_max_h="$6" out="$7"

    # Fit logo inside logo_max_w x logo_max_h, preserving aspect ratio
    $IM_CONVERT "$master" -resize "${logo_max_w}x${logo_max_h}" \
        "PNG32:$TEMP_DIR/social-logo.png"

    # Apply subtle level-2 shadow to the logo block so it reads as elevated
    make_shadow "$TEMP_DIR/social-logo.png" "$TEMP_DIR/social-logo-shadow.png" \
        12 5 4

    $IM_CONVERT -size "${canvas_w}x${canvas_h}" "xc:$bg_color" \
        "$TEMP_DIR/social-logo-shadow.png" -gravity center -composite \
        "$out"
}

# Transparent masters used for social assets so they composite cleanly on the
# chosen solid backgrounds (no mismatched inner bg showing through).
# og-image  — 1200x630, logo at ~70% width
compose_social "$TEMP_DIR/master-transparent.png"      "$LIGHT_BG" 1200 630 840 420 \
    "$BRAND_DIR/social/og-image.png"
compose_social "$TEMP_DIR/master-transparent-dark.png" "$DARK_BG"  1200 630 840 420 \
    "$BRAND_DIR/social/og-image-dark.png"

# Facebook cover — 820x312 (safe area ~640x312)
compose_social "$TEMP_DIR/master-transparent.png"      "$LIGHT_BG"  820 312 560 220 \
    "$BRAND_DIR/social/facebook-cover.png"
compose_social "$TEMP_DIR/master-transparent-dark.png" "$DARK_BG"   820 312 560 220 \
    "$BRAND_DIR/social/facebook-cover-dark.png"

# LinkedIn banner — 1584x396
compose_social "$TEMP_DIR/master-transparent.png"      "$LIGHT_BG" 1584 396 900 280 \
    "$BRAND_DIR/social/linkedin-banner.png"
compose_social "$TEMP_DIR/master-transparent-dark.png" "$DARK_BG"  1584 396 900 280 \
    "$BRAND_DIR/social/linkedin-banner-dark.png"

# --- Profile picture (true circular avatar; no double-mask) ---
# The SVG's inner artwork is rendered on a solid brand-color circle so when
# platforms crop to a circle the composition is centered and tight. A subtle
# level-1 shadow gives it gentle depth against the canvas it's placed on.
# Output canvas is padded beyond the circle so the shadow isn't clipped.
build_profile_picture() {
    local bg_color="$1" inner_icon="$2" out="$3"
    local size=800
    local pad=40                          # extra space for shadow
    local canvas=$(( size + pad * 2 ))

    # Blue (or dark) circle on a transparent, padded canvas
    local r=$((size / 2))
    local cx=$(( pad + r )) cy=$(( pad + r ))
    $IM_CONVERT -size "${canvas}x${canvas}" xc:transparent \
        -fill "$bg_color" \
        -draw "circle ${cx},${cy} ${cx},${pad}" \
        "PNG32:$TEMP_DIR/pp-circle.png"

    # Inner artwork scaled to ~70% of the circle diameter and centered
    local inner=$((size * 70 / 100))
    $IM_CONVERT "$inner_icon" -resize "${inner}x${inner}" \
        "PNG32:$TEMP_DIR/pp-inner.png"

    $IM_CONVERT "$TEMP_DIR/pp-circle.png" \
        "$TEMP_DIR/pp-inner.png" -gravity center -composite \
        "PNG32:$TEMP_DIR/pp-composed.png"

    # Subtle level-1 elevation shadow beneath the circle
    make_shadow "$TEMP_DIR/pp-composed.png" "$out" 8 3 2
}

# Light profile: deep-blue circle, white strokes, teal-light dot (matches light logo).
# Dark profile: light-blue circle, deep-blue strokes, dark-teal dot (matches dark logo).
build_profile_picture "$PRIMARY_BLUE"       "$TEMP_DIR/icon-inner-1024.png" \
    "$BRAND_DIR/social/profile-picture.png"
build_profile_picture "$PRIMARY_BLUE_LIGHT" "$TEMP_DIR/icon-inner-1024-dark.png" \
    "$BRAND_DIR/social/profile-picture-dark.png"

# ============================================================================
# Web app manifest (PWA / mobile install metadata)
# ============================================================================
# Lives at $BRAND_DIR/site.webmanifest. Referenced from HTML as
# <link rel="manifest" href="/brand/site.webmanifest"> when public/ is the web root.
cat > "$BRAND_DIR/site.webmanifest" <<EOF
{
  "name": "$BRAND_NAME",
  "short_name": "$BRAND_NAME",
  "description": "$TAGLINE",
  "icons": [
    {
      "src": "/brand/favicons/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/brand/favicons/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "theme_color": "$PRIMARY_BLUE",
  "background_color": "$LIGHT_BG",
  "display": "standalone",
  "start_url": "/"
}
EOF

# ============================================================================
# Wrap up
# ============================================================================
rm -rf "$TEMP_DIR"

TOTAL=$(find "$BRAND_DIR" -name '*.png' | wc -l | tr -d ' ')
echo ""
echo "=============================================="
echo "  Complete! Generated $TOTAL PNG files"
echo "=============================================="
echo ""
echo "Structure:"
echo "  $BRAND_DIR/"
echo "  ├── favicons/         (favicon-16, favicon-32, apple-touch-icon, etc.)"
echo "  ├── logo/full/        (logo-full-{300..1200}-{light,dark}.png + transparent)"
echo "  ├── logo/icon-only/   (icon-{48..1024}-{light,dark}.png)"
echo "  └── social/           (og-image, facebook-cover, linkedin-banner, profile-picture)"
echo ""
