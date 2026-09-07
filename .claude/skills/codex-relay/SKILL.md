---
name: codex-relay
description: The Claude-plans / Codex-executes protocol for this repo. Load this when the owner asks for work to be handed to Codex, says "give it to codex", "delegate", "let codex do it", when checking on a Codex run, or when reviewing what Codex produced. Also load before writing a Codex brief.
---

# Codex relay — how work moves through this repo

Claude is **senior engineer**: scope, plan, brief, verify, decide. Codex is **executor**:
implements one brief at a time. The owner talks only to Claude.

The whole point is token economy. Claude must never read what it can avoid reading.

## The loop

1. **Scope** — Claude reads only what's needed to write a correct brief. Grep over full-file
   reads. If the answer is in `AGENTS.md` or a design doc, don't re-derive it.
2. **Brief** — Claude writes `.claude/codex/briefs/<slug>.md`. Never paste the brief inline
   into a shell command; write the file, pass the file.
3. **Dispatch** —
   ```
   bash .claude/codex/run.sh new .claude/codex/briefs/<slug>.md
   ```
   Long jobs: run it with `run_in_background: true` and pick the result up on notification.
4. **Verify** — Claude reads *only*:
   - `.claude/codex/runs/<id>/last.md` (Codex's structured report)
   - `.claude/codex/runs/<id>/changes.txt` (porcelain + diffstat)
   - `git diff -- <specific paths>` for the files that actually matter
   Then Claude re-runs the checks itself rather than trusting the report. A green check mark
   in a report is a claim, not evidence.
5. **Iterate** — corrections go back on the *same* Codex session so it keeps its own context:
   ```
   bash .claude/codex/run.sh resume <run-id> .claude/codex/briefs/<slug>-fix.md
   ```
   This is far cheaper than re-briefing from scratch.
6. **Land** — Claude stages by explicit path and commits. Codex never commits.

## Writing a brief

Short. `AGENTS.md` already carries the repo rules, verification commands and report format —
do not repeat any of it. A good brief is:

```markdown
# <one-line goal>

## Context
2-4 lines. Only what Codex cannot cheaply discover itself.

## Files
- path — what to change (name the exact files; make Codex search only when you truly don't know)

## Do
1. Concrete, ordered, verifiable steps.

## Don't
- Explicit out-of-scope list.

## Acceptance
- How Claude will check this. Name the command or the observable behaviour.
```

Name the files. An unscoped brief makes Codex burn its quota exploring, and quota is the
scarce resource here.

## Sandbox

Default `workspace-write`: Codex edits files, no network, no escalation. Approval is `never`
in exec mode, so a command needing escalation fails fast instead of hanging. Only pass
`-s danger-full-access` when a task genuinely needs network, and say why to the owner first.

## When Codex is out of quota

The bridge writes `QUOTA_EXHAUSTED` into the run log and the reset time. When that happens,
tell the owner the reset time and offer: (a) Claude implements it directly, (b) queue the
brief for when quota returns. Don't silently retry.

## Run artefacts

`.claude/codex/runs/<id>/` — `brief-*.md`, `last.md`, `changes.txt`, `log.txt`,
`session.txt`, `base-sha.txt`. `log.txt` is the full transcript: it exists for the owner to
inspect, not for Claude to read into context.
