#!/usr/bin/env bash
# Codex bridge: Claude plans and verifies, Codex executes.
# Usage:
#   run.sh new    <brief.md> [-s SANDBOX] [-m MODEL]   -> start a task
#   run.sh resume <run-id> <followup.md> [-s SANDBOX]  -> continue that task
#   run.sh last                                        -> print last run's final message
#   run.sh runs                                        -> list runs
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNS_DIR="$REPO_ROOT/.claude/codex/runs"
mkdir -p "$RUNS_DIR"

resolve_codex() {
  if [ -n "${CODEX_BIN:-}" ] && [ -x "$CODEX_BIN" ]; then echo "$CODEX_BIN"; return; fi
  command -v codex 2>/dev/null && return
  ls -t /c/Users/*/AppData/Local/OpenAI/Codex/bin/*/codex.exe 2>/dev/null | head -1
}
CODEX="$(resolve_codex)"
[ -x "$CODEX" ] || { echo "FATAL: codex.exe not found. Set CODEX_BIN." >&2; exit 127; }

SANDBOX="workspace-write"
MODEL=""
# Repeatable `-c key=value`, forwarded to codex verbatim. Added 08/09/2026 so the planner can set
# `model_reasoning_effort` per task — a design or security brief is worth more thinking than a
# mechanical one, and that is a decision the brief author should be able to make.
CONFIG=()
CMD="${1:-}"; shift || true

case "$CMD" in
  runs) ls -1t "$RUNS_DIR" 2>/dev/null | head -20; exit 0 ;;
  last)
    d="$(ls -1td "$RUNS_DIR"/*/ 2>/dev/null | head -1)"
    [ -n "$d" ] || { echo "no runs yet"; exit 0; }
    echo "run: $(basename "$d")"; cat "$d/last.md" 2>/dev/null || echo "(no final message — see log.txt)"
    exit 0 ;;
  new|resume) : ;;
  *) sed -n '2,8p' "${BASH_SOURCE[0]}"; exit 2 ;;
esac

if [ "$CMD" = "new" ]; then
  BRIEF="${1:?brief file required}"; shift || true
else
  RUN_ID="${1:?run-id required}"; shift || true
  BRIEF="${1:?followup file required}"; shift || true
fi
while [ $# -gt 0 ]; do
  case "$1" in
    -s|--sandbox) SANDBOX="$2"; shift 2 ;;
    -m|--model)   MODEL="$2";   shift 2 ;;
    -c|--config)  CONFIG+=(-c "$2"); shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[ -f "$BRIEF" ] || { echo "FATAL: brief not found: $BRIEF" >&2; exit 2; }

if [ "$CMD" = "new" ]; then
  RUN_ID="$(date +%Y%m%d-%H%M%S)-$(basename "$BRIEF" .md)"
fi
OUT="$RUNS_DIR/$RUN_ID"; mkdir -p "$OUT"
cp "$BRIEF" "$OUT/brief-$(date +%H%M%S).md" 2>/dev/null || true

ARGS=(exec -C "$REPO_ROOT" -s "$SANDBOX" -o "$OUT/last.md" --color never)
[ -n "$MODEL" ] && ARGS+=(-m "$MODEL")
[ ${#CONFIG[@]} -gt 0 ] && ARGS+=("${CONFIG[@]}")

git -C "$REPO_ROOT" rev-parse HEAD > "$OUT/base-sha.txt" 2>/dev/null

echo "== codex $CMD | run=$RUN_ID | sandbox=$SANDBOX ==" | tee "$OUT/log.txt"
if [ "$CMD" = "new" ]; then
  "$CODEX" "${ARGS[@]}" - < "$BRIEF" 2>&1 | tee -a "$OUT/log.txt"
else
  SID="$(cat "$OUT/session.txt" 2>/dev/null)"
  [ -n "$SID" ] || { echo "FATAL: no session id recorded for run $RUN_ID" >&2; exit 2; }
  "$CODEX" "${ARGS[@]}" resume "$SID" - < "$BRIEF" 2>&1 | tee -a "$OUT/log.txt"
fi
RC=${PIPESTATUS[0]}

grep -m1 -oE 'session id: [0-9a-f-]+' "$OUT/log.txt" 2>/dev/null | awk '{print $3}' > "$OUT/session.txt.new"
[ -s "$OUT/session.txt.new" ] && mv "$OUT/session.txt.new" "$OUT/session.txt" || rm -f "$OUT/session.txt.new"

if grep -q 'usage limit' "$OUT/log.txt" 2>/dev/null; then
  echo "QUOTA_EXHAUSTED: $(grep -m1 -o 'try again at [^\"]*' "$OUT/log.txt")" | tee -a "$OUT/log.txt"
fi

{
  echo "---- CHANGED FILES ----"
  git -C "$REPO_ROOT" status --porcelain
  echo "---- DIFFSTAT ----"
  git -C "$REPO_ROOT" diff --stat
} > "$OUT/changes.txt" 2>&1

echo
echo "RUN_ID=$RUN_ID  RC=$RC"
echo "final:   .claude/codex/runs/$RUN_ID/last.md"
echo "changes: .claude/codex/runs/$RUN_ID/changes.txt"
exit $RC
