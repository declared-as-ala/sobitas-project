/**
 * The animation feature set, in its own module so it becomes its own chunk.
 *
 * ── WHY THIS FILE EXISTS AT ALL ────────────────────────────────────────────────────────────
 * `<LazyMotion features={domAnimation}>` does NOT lazy-load anything — passing the value directly
 * means the import is static and the whole feature set lands in the route's initial JavaScript.
 * Measured on this page: 14.8 kB → 56.6 kB route JS, 170 → 212 kB first load. "Lazy" is in the
 * component's name, not in its behaviour; it is the FUNCTION form that defers.
 *
 * Passing a loader instead splits `domAnimation` into a chunk that is fetched after hydration,
 * while the initial bundle carries only the `m` shell. The welcome step is static — three numbers
 * and a button — so nothing on the first screen is waiting for this.
 *
 * `domAnimation`, not `domMax`: max adds layout projection and drag, neither of which this wizard
 * uses. Anything here that looked like it wanted `layout` was removed rather than upgraded, since
 * `layout` under `domAnimation` is a silent no-op — the worst kind of dead code, because it looks
 * like it is doing something.
 */

import { domAnimation } from 'motion/react';

export default domAnimation;
