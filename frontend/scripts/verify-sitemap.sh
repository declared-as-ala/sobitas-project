#!/usr/bin/env sh
# Verify sitemap.xml returns XML (not HTML). Use for local or production.
# Usage: BASE=https://protein.tn ./scripts/verify-sitemap.sh   or  ./scripts/verify-sitemap.sh  (defaults to localhost:3000)

BASE="${BASE_URL:-${BASE:-http://localhost:3000}}"
URL="${BASE}/sitemap.xml"

echo "Checking: $URL"
echo "---"
echo "1) Headers (curl -I):"
curl -sI "$URL" | head -20
echo ""
echo "2) First 20 lines of body (must be XML, not HTML):"
curl -sS "$URL" | head -20
echo ""
echo "---"
if curl -sS "$URL" | head -1 | grep -q '<?xml'; then
  echo "OK: Response starts with <?xml"
else
  echo "FAIL: Response does not start with <?xml (might be HTML)"
  exit 1
fi
if curl -sS "$URL" | head -5 | grep -qi '<html'; then
  echo "FAIL: Response contains <html>"
  exit 1
else
  echo "OK: No <html> in first lines"
fi
echo "Done."
