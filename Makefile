# nidhi Brand Assets Makefile
# Generates all brand assets including favicons, logos, and social media images

# Default source SVG file
SOURCE_SVG ?= public/favicon.svg

# Output directory derived from source
OUTPUT_DIR = $(dir $(SOURCE_SVG))
BRAND_DIR = $(OUTPUT_DIR)brand

.PHONY: all brand favicons clean verify help

# Default target: generate everything
all: brand

# Help target
help:
	@echo "nidhi Brand Asset Generator"
	@echo ""
	@echo "Usage:"
	@echo "  make all              - Generate all brand assets (default)"
	@echo "  make brand            - Generate all brand assets"
	@echo "  make favicons         - Generate only favicon assets"
	@echo "  make clean            - Remove generated brand assets"
	@echo "  make verify           - Check the tools the generators need"
	@echo "  make help             - Show this help"
	@echo ""
	@echo "Custom source SVG:"
	@echo "  make SOURCE_SVG=path/to/icon.svg"
	@echo ""
	@echo "Example:"
	@echo "  make SOURCE_SVG=public/favicon.svg"

# Generate all brand assets
brand:
	@echo "Generating nidhi brand assets..."
	@./generate-brand-assets.sh $(SOURCE_SVG)
	@echo ""
	@echo "Done! Assets generated in: $(BRAND_DIR)"

# Generate only favicons (lightweight option)
favicons:
	@echo "Generating favicon assets only..."
	@./generate-favicons.sh $(SOURCE_SVG)
	@echo ""
	@echo "Done! Favicons generated in: $(OUTPUT_DIR)"

# Clean up generated assets
clean:
	@echo "Cleaning generated brand assets..."
	@if [ -d "$(BRAND_DIR)" ]; then \
		rm -rf "$(BRAND_DIR)"; \
		echo "Removed: $(BRAND_DIR)"; \
	fi
	@echo "Clean complete!"

# Verify dependencies. The same checks the two scripts make:
# generate-brand-assets.sh needs ImageMagick (`magick`, or the older `convert`)
# and one SVG renderer (rsvg-convert or inkscape); generate-favicons.sh runs
# with any one of convert, rsvg-convert or inkscape.
verify:
	@echo "Checking dependencies..."
	@if command -v magick > /dev/null 2>&1; then echo "✓ ImageMagick (magick) found"; \
	elif command -v convert > /dev/null 2>&1; then echo "✓ ImageMagick (convert) found"; \
	else echo "Error: ImageMagick not found (magick or convert). Install with: brew install imagemagick"; exit 1; fi
	@if command -v rsvg-convert > /dev/null 2>&1; then echo "✓ rsvg-convert found"; \
	elif command -v inkscape > /dev/null 2>&1; then echo "✓ inkscape found"; \
	else echo "Error: no SVG renderer found (rsvg-convert or inkscape). Install with: brew install librsvg"; exit 1; fi
	@echo "✓ All dependencies satisfied"
