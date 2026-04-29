#!/bin/bash

# Generate favicon assets from an SVG file
# Usage: ./generate-favicons.sh path/to/favicon.svg

set -e

SVG_PATH="$1"

if [ -z "$SVG_PATH" ]; then
    echo "Usage: $0 <path/to/favicon.svg>"
    echo "Example: $0 public/test/favicon.svg"
    exit 1
fi

if [ ! -f "$SVG_PATH" ]; then
    echo "Error: File not found: $SVG_PATH"
    exit 1
fi

# Get the directory containing the SVG
OUTPUT_DIR=$(dirname "$SVG_PATH")
SVG_FILE=$(basename "$SVG_PATH")

echo "Generating favicon assets from: $SVG_PATH"
echo "Output directory: $OUTPUT_DIR"

# Check for available conversion tool
if command -v convert &> /dev/null; then
    CONVERT_CMD="convert -background none"
elif command -v rsvg-convert &> /dev/null; then
    CONVERT_CMD="rsvg-convert"
    USE_RSVG=true
elif command -v inkscape &> /dev/null; then
    CONVERT_CMD="inkscape --export-background-opacity=0"
    USE_INKSCAPE=true
else
    echo "Error: No suitable conversion tool found. Please install ImageMagick, librsvg, or Inkscape."
    exit 1
fi

generate_png() {
    local size=$1
    local output=$2

    echo "Generating $output (${size}x${size})..."

    if [ "$USE_RSVG" = true ]; then
        rsvg-convert -w "$size" -h "$size" "$SVG_PATH" > "$OUTPUT_DIR/$output"
    elif [ "$USE_INKSCAPE" = true ]; then
        inkscape "$SVG_PATH" --export-width="$size" --export-height="$size" --export-filename="$OUTPUT_DIR/$output"
    else
        convert -background none "$SVG_PATH" -resize "${size}x${size}" "$OUTPUT_DIR/$output"
    fi
}

# Generate PNG files
generate_png 16 "favicon-16.png"
generate_png 32 "favicon-32.png"
generate_png 150 "mstile-150x150.png"
generate_png 180 "apple-touch-icon.png"
generate_png 192 "android-chrome-192x192.png"
generate_png 512 "android-chrome-512x512.png"

# Generate favicon.ico (multi-size ICO file)
echo "Generating favicon.ico..."
if [ "$USE_RSVG" = true ]; then
    rsvg-convert -w 32 -h 32 "$SVG_PATH" | convert - "$OUTPUT_DIR/favicon.ico"
    # Add 16x16 version to ICO
    rsvg-convert -w 16 -h 16 "$SVG_PATH" | convert "$OUTPUT_DIR/favicon.ico" - "$OUTPUT_DIR/favicon.ico"
elif [ "$USE_INKSCAPE" = true ]; then
    inkscape "$SVG_PATH" --export-width=32 --export-height=32 --export-filename="$OUTPUT_DIR/favicon-32-temp.png"
    inkscape "$SVG_PATH" --export-width=16 --export-height=16 --export-filename="$OUTPUT_DIR/favicon-16-temp.png"
    convert "$OUTPUT_DIR/favicon-16-temp.png" "$OUTPUT_DIR/favicon-32-temp.png" "$OUTPUT_DIR/favicon.ico"
    rm -f "$OUTPUT_DIR/favicon-16-temp.png" "$OUTPUT_DIR/favicon-32-temp.png"
else
    convert -background none "$SVG_PATH" -resize 32x32 "$SVG_PATH" -resize 16x16 "$OUTPUT_DIR/favicon.ico"
fi

echo "Done! Generated files in $OUTPUT_DIR:"
ls -la "$OUTPUT_DIR"/*.png "$OUTPUT_DIR"/*.ico 2>/dev/null || ls -la "$OUTPUT_DIR"