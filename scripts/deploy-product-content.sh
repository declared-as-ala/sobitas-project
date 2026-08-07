#!/usr/bin/env bash
#
# One-shot deploy for the product-content pipeline.
#
#   bash scripts/deploy-product-content.sh            # report only, writes nothing
#   bash scripts/deploy-product-content.sh --apply    # writes
#
# Reports first, always. Every command in here has a read-only mode, and the read-only mode is the
# default, because two of the steps make decisions that are painful to reverse: promoting a barcode
# onto the wrong product silently attaches another item's nutrition panel to it forever, and
# rebuilding panels overwrites the nutrition_values column.
#
# Prints a block at the end that is worth pasting back to whoever is reviewing the run.

set -uo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

# Run artisan directly, or through Docker when a container is what actually holds the app.
if [ -n "${DOCKER_SERVICE:-}" ]; then
  ART=(docker compose exec -T "$DOCKER_SERVICE" php artisan)
elif [ -f filament/artisan ]; then
  ART=(php filament/artisan)
else
  echo "!! Cannot find filament/artisan, and DOCKER_SERVICE is not set." >&2
  echo "   Set DOCKER_SERVICE=app (or your service name) and re-run." >&2
  exit 1
fi

step() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mXX %s\033[0m\n' "$*"; exit 1; }

FAILED=0
run() {
  echo "\$ ${*}"
  if ! "$@"; then
    FAILED=1
    warn "command failed: ${*}"
  fi
}

step "1/6  Migrate"
run "${ART[@]}" migrate --force
run "${ART[@]}" config:clear
run "${ART[@]}" route:clear

# The gate. Everything downstream writes to or reads from this column, so a missing migration must
# stop the run rather than produce six steps of confusing output.
HAS_COL="$("${ART[@]}" tinker --execute="echo Schema::hasColumn('products','nutrition_facts') ? 'ok' : 'MISSING';" 2>/dev/null | tr -d '\r\n ')"
case "$HAS_COL" in
  *ok*) echo "   products.nutrition_facts present" ;;
  *)    die "products.nutrition_facts is MISSING — migration did not run. Stopping." ;;
esac

step "2/6  Frontend build"
if [ -d frontend ]; then
  ( cd frontend && run npm ci --no-audit --no-fund && run npm run build )
else
  warn "no frontend/ directory here — skipping"
fi

step "3/6  Barcodes already in code_product / sku"
# ALWAYS report first. The output includes conflicts (two columns disagreeing) and duplicate
# barcodes across products; both are judgement calls a script must not make. A duplicate means two
# products claim the same trade item, and the loser gets the winner's Supplement Facts.
run "${ART[@]}" products:recover-gtin
if [ "$APPLY" = "1" ]; then
  warn "Read the conflict/duplicate lines above before trusting this."
  run "${ART[@]}" products:recover-gtin --apply
fi

step "4/6  FAQs already written inside descriptions"
run "${ART[@]}" products:extract-faq
[ "$APPLY" = "1" ] && run "${ART[@]}" products:extract-faq --apply

step "5/6  NIH label database (barcode-matched only)"
# Expect this to fill very little: DSLD transcribes US labels and this catalogue is Polish, Spanish
# and Portuguese. Measured 07/08/2026 it matched 0 of 12 barcoded products. It stays in the pipeline
# because when it DOES match a barcode it is excellent, not because it is the coverage story.
run "${ART[@]}" products:enrich-dsld --limit=25
[ "$APPLY" = "1" ] && run "${ART[@]}" products:enrich-dsld --limit=25 --apply

step "6/6  Re-render stored panels"
run "${ART[@]}" products:rebuild-nutrition-panels --dry-run
[ "$APPLY" = "1" ] && run "${ART[@]}" products:rebuild-nutrition-panels

step "Measure (live, as Googlebot)"
if [ -d frontend ]; then
  ( cd frontend && run npm run audit:pdp )
fi

printf '\n\033[1;36m================ paste this back ================\033[0m\n'
echo "mode:            $([ "$APPLY" = 1 ] && echo APPLY || echo 'report only')"
echo "nutrition_facts: $HAS_COL"
echo "failures:        $FAILED"
echo
echo "Expected after a successful deploy:"
echo "  comparisonPct   0% -> >0%   (needs no data; if still 0 the frontend build did not take)"
echo "  refIsGtinPct    rises with step 3"
echo "  supplementPanelPct / nutritionImagePct stay 0% until panels are typed in the admin"
printf '\033[1;36m===============================================\033[0m\n'

exit "$FAILED"
