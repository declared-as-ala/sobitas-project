#!/usr/bin/env sh
#
# Verify the sitemap INDEX and EVERY child sitemap it points at.
#
# WHY THIS DOES MORE THAN CHECK FOR "<?xml"
# The previous version fetched /sitemap.xml, confirmed it started with <?xml and contained no
# <html>, and printed OK. A sitemap index that had lost 15,000 of its 20,000 product URLs passes
# that check perfectly: it is still valid XML, still not HTML, still HTTP 200. An assertion that
# never counts the URLs reports green on a sitemap that is quietly telling Google the catalogue was
# deleted. So this walks the index, fetches every child, and counts.
#
# Usage:
#   ./scripts/verify-sitemap.sh                          # defaults to http://localhost:3000
#   BASE=https://protein.tn ./scripts/verify-sitemap.sh
#   BASE=https://protein.tn API_BASE=https://admin.protein.tn/api ./scripts/verify-sitemap.sh
#
# Env:
#   BASE / BASE_URL   site origin to verify           (default http://localhost:3000)
#   API_BASE          backend /api origin; when set, the product URL count is cross-checked
#                     against pagination.total from /all_products
#   MIN_URLS          fail if the whole sitemap has fewer URLs than this   (default 1)
#   TOLERANCE_PCT     allowed shortfall vs the API's published-product total, in percent
#                     (default 10 — products may legitimately be absent: noindex, or no
#                      resolvable subcategory, which is deliberately not submitted)

set -u

BASE="${BASE_URL:-${BASE:-http://localhost:3000}}"
BASE=$(printf '%s' "$BASE" | sed 's#/$##')
INDEX_URL="${BASE}/sitemap.xml"
API_BASE="${API_BASE:-}"
MIN_URLS="${MIN_URLS:-1}"
TOLERANCE_PCT="${TOLERANCE_PCT:-10}"

# Protocol limits. A file over either one is rejected by Google WHOLE — not truncated — so a
# child that crosses them loses every URL in it, silently.
MAX_URLS_PER_FILE=50000
MAX_BYTES_PER_FILE=52428800   # 50 MB

WORK="${TMPDIR:-/tmp}/verify-sitemap.$$"
mkdir -p "$WORK" || exit 1
# shellcheck disable=SC2064
trap "rm -rf '$WORK'" EXIT INT TERM

fail() { echo "FAIL: $*"; exit 1; }
ok()   { echo "OK:   $*"; }

echo "Sitemap index: $INDEX_URL"
echo "------------------------------------------------------------"

# ── 1. The index itself ──────────────────────────────────────────────────────────────────────
INDEX_BODY="$WORK/index.xml"
INDEX_CODE=$(curl -sS -o "$INDEX_BODY" -w '%{http_code}' "$INDEX_URL") || fail "curl failed for $INDEX_URL"

[ "$INDEX_CODE" = "200" ] || fail "$INDEX_URL returned HTTP $INDEX_CODE (503 here means the data crawl refused to publish a degraded sitemap — check the app logs)"
head -1 "$INDEX_BODY" | grep -q '<?xml' || fail "index does not start with <?xml"
grep -qi '<html' "$INDEX_BODY" && fail "index contains <html> — an error page is being served as the sitemap"
grep -q '<sitemapindex' "$INDEX_BODY" || fail "index is not a <sitemapindex> — it must be an index, not a flat <urlset>"
ok "index is XML and is a <sitemapindex>"

# ── 2. robots.txt must advertise the index ───────────────────────────────────────────────────
ROBOTS="$WORK/robots.txt"
if curl -sS -o "$ROBOTS" -w '' "${BASE}/robots.txt"; then
  # Match any origin: robots.txt is built from NEXT_PUBLIC_BASE_URL, which is the production origin
  # even when this script is pointed at localhost. What matters is that it names the INDEX.
  if grep -qi '^Sitemap:.*/sitemap\.xml[[:space:]]*$' "$ROBOTS"; then
    ok "robots.txt points at the sitemap index ($(grep -i '^Sitemap:' "$ROBOTS" | head -1))"
  else
    fail "robots.txt does not declare a /sitemap.xml index"
  fi
  # Children must NOT be advertised separately: submitted-twice splits Search Console coverage
  # across two submission sources and destroys per-content-type reporting.
  if grep -qi "^Sitemap:.*/sitemaps/" "$ROBOTS"; then
    fail "robots.txt lists a CHILD sitemap; only the index may be declared"
  fi
  ok "robots.txt declares the index only"
fi

# ── 3. Every child ───────────────────────────────────────────────────────────────────────────
CHILDREN=$(grep -o '<loc>[^<]*</loc>' "$INDEX_BODY" | sed 's|<loc>||; s|</loc>||')
CHILD_COUNT=$(printf '%s\n' "$CHILDREN" | grep -c . )
[ "$CHILD_COUNT" -ge 1 ] || fail "index lists no child sitemaps"
[ "$CHILD_COUNT" -le "$MAX_URLS_PER_FILE" ] || fail "index lists $CHILD_COUNT children, over the $MAX_URLS_PER_FILE limit"
ok "index lists $CHILD_COUNT child sitemap(s)"
echo "------------------------------------------------------------"

TOTAL_URLS=0
PRODUCT_URLS=0

for CHILD in $CHILDREN; do
  NAME=$(basename "$CHILD")
  BODY="$WORK/$NAME"
  META=$(curl -sS -o "$BODY" -w '%{http_code} %{size_download} %{content_type}' "$CHILD") \
    || fail "curl failed for $CHILD"
  CODE=$(printf '%s' "$META" | cut -d' ' -f1)
  SIZE=$(printf '%s' "$META" | cut -d' ' -f2)
  CTYPE=$(printf '%s' "$META" | cut -d' ' -f3)

  [ "$CODE" = "200" ] || fail "$CHILD returned HTTP $CODE"
  case "$CTYPE" in
    *xml*) : ;;
    *) fail "$CHILD served Content-Type '$CTYPE', expected XML" ;;
  esac
  head -1 "$BODY" | grep -q '<?xml' || fail "$CHILD does not start with <?xml"
  grep -q '<urlset' "$BODY" || fail "$CHILD is not a <urlset>"

  N=$(grep -c '<url>' "$BODY")
  [ "$N" -ge 1 ] || fail "$CHILD contains 0 URLs — an empty child must never be listed in the index"
  [ "$N" -le "$MAX_URLS_PER_FILE" ] || fail "$CHILD contains $N URLs, over the $MAX_URLS_PER_FILE protocol limit"
  [ "$SIZE" -le "$MAX_BYTES_PER_FILE" ] || fail "$CHILD is $SIZE bytes, over the $MAX_BYTES_PER_FILE byte limit"

  TOTAL_URLS=$((TOTAL_URLS + N))
  case "$NAME" in
    products-*) PRODUCT_URLS=$((PRODUCT_URLS + N)) ;;
  esac

  printf 'OK:   %-28s %6s URLs %10s bytes\n' "$NAME" "$N" "$SIZE"
done

echo "------------------------------------------------------------"
echo "Total URLs across all children: $TOTAL_URLS  (products: $PRODUCT_URLS)"

[ "$TOTAL_URLS" -ge "$MIN_URLS" ] || fail "sitemap has $TOTAL_URLS URLs, below MIN_URLS=$MIN_URLS"

# ── 4. Unknown child names must 404, not render an empty sitemap ─────────────────────────────
PROBE_CODE=$(curl -sS -o /dev/null -w '%{http_code}' "${BASE}/sitemaps/does-not-exist.xml")
[ "$PROBE_CODE" = "404" ] || fail "/sitemaps/does-not-exist.xml returned HTTP $PROBE_CODE, expected 404 (a crawler must not be able to mint empty sitemap URLs)"
ok "unknown child name 404s"

# ── 5. Cross-check the product count against the backend ─────────────────────────────────────
# This is the assertion that catches "the sitemap still parses, it just lost most of the
# catalogue". Without it, every check above passes on a sitemap missing 15,000 URLs.
if [ -n "$API_BASE" ]; then
  API_BASE=$(printf '%s' "$API_BASE" | sed 's#/$##')
  PAYLOAD=$(curl -sS "${API_BASE}/all_products?per_page=1&page=1") || fail "curl failed for ${API_BASE}/all_products"
  PAGINATION=$(printf '%s' "$PAYLOAD" | sed -n 's/.*"pagination"[[:space:]]*:[[:space:]]*{\([^}]*\)}.*/\1/p')
  API_TOTAL=$(printf '%s' "$PAGINATION" | sed -n 's/.*"total"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p')
  if [ -z "$API_TOTAL" ]; then
    echo "WARN: could not read pagination.total from ${API_BASE}/all_products — product count NOT cross-checked"
  else
    FLOOR=$(( API_TOTAL * (100 - TOLERANCE_PCT) / 100 ))
    echo "Backend reports $API_TOTAL published products; sitemap carries $PRODUCT_URLS product URLs (floor $FLOOR)"
    [ "$PRODUCT_URLS" -ge "$FLOOR" ] || fail "only $PRODUCT_URLS of $API_TOTAL published products are in the sitemap — more than ${TOLERANCE_PCT}% missing"
    [ "$PRODUCT_URLS" -le "$API_TOTAL" ] || fail "$PRODUCT_URLS product URLs for only $API_TOTAL published products — duplicates or stale URLs are being submitted"
    ok "product coverage within ${TOLERANCE_PCT}% of the backend total"
  fi
else
  echo "NOTE: set API_BASE=<backend>/api to cross-check the product count against the database."
fi

echo "------------------------------------------------------------"
echo "Done."
