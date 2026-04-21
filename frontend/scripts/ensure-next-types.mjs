/**
 * Ensures `.next/types/routes.d.ts` exists so `next-env.d.ts` triple-slash reference
 * does not break `tsc --noEmit` on a fresh clone (before `next dev` / `next build`).
 * Next.js overwrites this file when the app is built.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const typesDir = path.join(root, ".next", "types");
const routesPath = path.join(typesDir, "routes.d.ts");

fs.mkdirSync(typesDir, { recursive: true });

if (!fs.existsSync(routesPath)) {
  fs.writeFileSync(
    routesPath,
    `// Placeholder until Next.js generates real route types (run \`next dev\` or \`next build\`).
export {}
`,
    "utf8",
  );
}
