#!/bin/bash

# Analyze Nginx access logs for timing breakdown
# Run: docker exec sobitas-backend-nginx bash /var/www/html/tests/analyze_nginx_logs.sh

LOG_FILE="/var/log/nginx/access.log"
TAIL_LINES=20

echo "🔍 Nginx Timing Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Analyzing last ${TAIL_LINES} requests..."
echo ""

# Extract timing fields from last N lines
tail -n ${TAIL_LINES} ${LOG_FILE} | grep "all_products_fast" | while read line; do
    # Extract timing values using regex
    rt=$(echo "$line" | grep -oP 'rt=\K[0-9.]+' || echo "0")
    urt=$(echo "$line" | grep -oP 'urt=\K[0-9.]+' || echo "0")
    uht=$(echo "$line" | grep -oP 'uht=\K[0-9.]+' || echo "0")
    uct=$(echo "$line" | grep -oP 'uct=\K[0-9.]+' || echo "0")
    
    # Calculate overhead (request_time - upstream_response_time)
    overhead=$(echo "$rt $urt" | awk '{printf "%.3f", $1 - $2}')
    
    echo "Request:"
    echo "  Total (rt):     ${rt}s"
    echo "  Upstream (urt): ${urt}s"
    echo "  Header (uht):   ${uht}s"
    echo "  Connect (uct):  ${uct}s"
    echo "  Overhead:       ${overhead}s (rt - urt)"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Interpretation:"
echo ""
echo "If 'urt' (upstream_response_time) is high:"
echo "  → PHP-FPM is slow (check PHP-FPM status, slow queries)"
echo ""
echo "If 'overhead' (rt - urt) is high:"
echo "  → Nginx buffering/handshake is slow (check fastcgi_buffering, keepalive)"
echo ""
echo "If 'uct' (upstream_connect_time) is high:"
echo "  → Connection establishment is slow (check network, DNS)"
echo ""
echo "If 'uht' (upstream_header_time) is high but 'urt' is low:"
echo "  → PHP-FPM is fast but first byte delay (check fastcgi_buffering off)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
