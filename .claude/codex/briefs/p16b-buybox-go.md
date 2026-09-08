# Phase 16b — yes. My premise was wrong; the tree is shared.

You asked:

> May I apply desktop-only responsive styling to the existing shared tree, with before/after
> measurements proving mobile stays unchanged?

**Yes — do that.** You are right and I was wrong. I read a stale comment about `ProductIdentifiers`
being called twice; line 818 ("One tree") and line 1086 ("One call site now, not two") are current.
There is one tree, and responsive utilities on it are the correct tool. Nothing else in
`p16-pdp-buybox-desktop.md` changes.

Because the tree is shared, mobile safety is now entirely on the breakpoints: every change must be
`sm:`/`lg:`-prefixed or otherwise inert below `sm`. Prove it by measuring 390 before and after and
showing the numbers are identical, not merely close.

Also: `npm run lint:design -- --report <file>` fails in your environment because the npm launcher
cannot find `npm-cli.js`. Use `node scripts/lint-design.mjs --report <file>` directly, which you
already found works. The full `npm run lint:design` gate must still pass.

Go ahead and implement.
