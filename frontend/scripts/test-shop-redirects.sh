#!/usr/bin/env bash
# Tests for /shop/:slug anti-404 redirects (301 to /category/:slug when product not found).
# Run against production: ./scripts/test-shop-redirects.sh
# Or local: BASE=https://protein.tn ./scripts/test-shop-redirects.sh (default)
# Or: BASE=http://localhost:3000 ./scripts/test-shop-redirects.sh

BASE="${BASE:-https://protein.tn}"

echo "=== Testing shop anti-404 redirects (BASE=$BASE) ==="
echo ""

# 1) /shop/proteine-whey (category slug, no product) → 301/308 → /category/proteine-whey
echo "1) GET /shop/proteine-whey (expect 301 or 308, Location: /category/proteine-whey)"
curl -sI "$BASE/shop/proteine-whey" | head -5
echo ""

# 2) /shop/instant-mass-7kg-scenit-nutrition (product) → 200
echo "2) GET /shop/instant-mass-7kg-scenit-nutrition (expect 200)"
curl -sI "$BASE/shop/instant-mass-7kg-scenit-nutrition" | head -5
echo ""

# 3) /shop/slug-inexistant → 404
echo "3) GET /shop/slug-inexistant (expect 404)"
curl -sI "$BASE/shop/slug-inexistant" | head -5
echo ""

# 4) /shop/proteine-whey?utm=1 → 301/308, Location must contain ?utm=1
echo "4) GET /shop/proteine-whey?utm=1 (expect 301/308, Location contains ?utm=1)"
curl -sI "$BASE/shop/proteine-whey?utm=1" | grep -i location
echo ""

echo "=== Done ==="
