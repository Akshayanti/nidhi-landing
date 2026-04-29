# nidhi Brand Assets Makefile
# Generates all brand assets including favicons, logos, and social media images

# Default source SVG file
SOURCE_SVG ?= public/test/favicon.svg

# Output directory derived from source
OUTPUT_DIR = $(dir $(SOURCE_SVG))
BRAND_DIR = $(OUTPUT_DIR)brand

.PHONY: all brand favicons clean help

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
	@echo "  make help             - Show this help"
	@echo ""
	@echo "Custom source SVG:"
	@echo "  make SOURCE_SVG=path/to/icon.svg"
	@echo ""
	@echo "Example:"
	@echo "  make SOURCE_SVG=assets/branding/nidhi-icon.svg"

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

# Verify dependencies
verify:
	@echo "Checking dependencies..."
	@which convert > /dev/null 2>&1 || (echo "Error: ImageMagick not found. Install with: brew install imagemagick" && exit 1)
	@echo "✓ ImageMagick (convert) found"
	@echo "✓ All dependencies satisfied"
