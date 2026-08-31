<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * ── A CLASS THAT DOES NOT EXIST IS ONLY AN ERROR ON THE PAGE THAT TOUCHES IT ────────────────
 * This exists because of one word. `ProductResource` type-hinted `Forms\Get $get` on two fields,
 * i.e. `Filament\Forms\Get` — a class removed in Filament v4 (it is
 * `Filament\Schemas\Components\Utilities\Get` now). Every other resource in this codebase had
 * already been migrated; that one file had not.
 *
 * PHP does not care about a dead class name until something evaluates it, and those two closures
 * live inside a Repeater ITEM. `CreateRecord::fillForm()` calls `$this->form->fill()` with no
 * arguments, which applies component defaults, and `Repeater::setUp()` defaults to one empty item
 * — so the item existed, the closures ran, and /products/create returned 500 on every load.
 * `EditRecord` fills from the record instead, defaults are skipped, the repeater renders zero
 * items, and the same file worked perfectly. The admin could edit products and not add one, and
 * nothing in the code looked wrong.
 *
 * That is the shape this command is for: an upgrade leftover sitting in a branch nobody exercises.
 * It resolves every Filament class name referenced anywhere under app/ — through `use` aliases,
 * the way PHP would — and reports the ones `class_exists()` cannot find.
 *
 *     php artisan filament:check-classes
 *
 * Exits non-zero when something is missing, so it belongs in the deploy script next to `migrate`.
 * It costs about a second and it would have caught this before the page did.
 */
class CheckFilamentClasses extends Command
{
    protected $signature = 'filament:check-classes
                            {--path= : Directory to scan (default: app/)}';

    protected $description = 'Report Filament class names referenced in app/ that no longer exist';

    public function handle(): int
    {
        $root = $this->option('path') ?: app_path();

        if (! is_dir($root)) {
            $this->error("Not a directory: {$root}");

            return self::FAILURE;
        }

        $missing = [];
        $checked = 0;
        $files = 0;

        foreach ($this->phpFiles($root) as $file) {
            $files++;
            $source = @file_get_contents($file) ?: '';
            $uses = $this->useMap($source);

            foreach ($this->referencedClasses($source, $uses) as $class) {
                // Only Filament's own namespaces. Everything else — Laravel, the app, vendor
                // packages — is either autoloaded eagerly or already covered by other tooling,
                // and scanning it would produce false positives on class names inside strings.
                if (! str_starts_with($class, 'Filament\\')) {
                    continue;
                }

                $checked++;

                if (class_exists($class) || interface_exists($class) || trait_exists($class) || enum_exists($class)) {
                    continue;
                }

                $missing[$class][] = str_replace(base_path() . DIRECTORY_SEPARATOR, '', $file);
            }
        }

        $this->line(sprintf('Scanned %d file(s), resolved %d Filament class reference(s).', $files, $checked));

        if ($missing === []) {
            $this->info('All referenced Filament classes exist.');

            return self::SUCCESS;
        }

        $this->newLine();
        $this->error('These Filament classes do not exist — the page that evaluates them will 500:');
        $this->newLine();

        foreach ($missing as $class => $where) {
            $this->line("  <fg=red;options=bold>{$class}</>");
            foreach (array_unique($where) as $file) {
                $this->line("      <fg=gray>{$file}</>");
            }
        }

        $this->newLine();
        $this->line('<fg=gray>Filament v4 moved several v3 classes. Get/Set now live under Filament\\Schemas\\Components\\Utilities.</>');

        return self::FAILURE;
    }

    /** @return iterable<int, string> */
    private function phpFiles(string $root): iterable
    {
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));

        foreach ($it as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                yield $file->getPathname();
            }
        }
    }

    /**
     * The file's `use` statements, alias => fully-qualified.
     *
     * Both spellings matter: `use Filament\Forms;` makes `Forms\Get` mean `Filament\Forms\Get`,
     * and `use Filament\Schemas\Components\Utilities\Get;` makes a bare `Get` mean that. The bug
     * this command exists for was the first kind, which is exactly the one a reader skims past.
     *
     * @return array<string, string>
     */
    private function useMap(string $source): array
    {
        $map = [];

        if (preg_match_all('/^use\s+([A-Za-z0-9_\\\\]+)(?:\s+as\s+([A-Za-z0-9_]+))?\s*;/mi', $source, $m, PREG_SET_ORDER)) {
            foreach ($m as $use) {
                $fq = trim($use[1], '\\');
                $alias = $use[2] ?? substr($fq, (strrpos($fq, '\\') ?: -1) + 1);
                $map[$alias] = $fq;
            }
        }

        return $map;
    }

    /**
     * Class names the file names, resolved the way PHP would.
     *
     * Deliberately conservative: only identifiers in a position where PHP requires a real class —
     * `Foo\Bar::`, `new Foo\Bar`, a parameter type hint, `use Foo\Bar` itself. Matching every
     * capitalised token would flag class names quoted inside strings and comments, and a checker
     * that cries wolf is a checker that gets removed.
     *
     * @param  array<string, string>  $uses
     * @return array<int, string>
     */
    private function referencedClasses(string $source, array $uses): array
    {
        // Comments carry class names by design — every fix in this codebase is documented with the
        // wrong name next to the right one. Stripping them is what keeps this command honest.
        $code = preg_replace('!/\*.*?\*/!s', '', $source) ?? $source;
        $code = preg_replace('!(^|[^:])//.*$!m', '$1', $code) ?? $code;

        $found = [];

        // Foo\Bar::something  and  new Foo\Bar(
        if (preg_match_all('/(?:new\s+|(?<![\w$>]))((?:\\\\)?[A-Z][A-Za-z0-9_]*(?:\\\\[A-Z][A-Za-z0-9_]*)*)\s*(?:::|\()/', $code, $m)) {
            $found = array_merge($found, $m[1]);
        }

        // Parameter type hints:  function (Foo\Bar $x)  /  fn (Foo\Bar $x)
        if (preg_match_all('/[(,]\s*\??((?:\\\\)?[A-Z][A-Za-z0-9_]*(?:\\\\[A-Z][A-Za-z0-9_]*)*)\s+\$/', $code, $m)) {
            $found = array_merge($found, $m[1]);
        }

        $resolved = [];

        foreach (array_unique($found) as $name) {
            $name = ltrim($name, '\\');

            if ($name === '') {
                continue;
            }

            // Already fully qualified in the source.
            if (str_starts_with($name, 'Filament\\')) {
                $resolved[] = $name;
                continue;
            }

            $head = strtok($name, '\\');
            if (isset($uses[$head])) {
                $rest = substr($name, strlen($head));
                $resolved[] = $uses[$head] . $rest;
            }
        }

        /*
         * The `use` statements themselves are deliberately NOT checked.
         *
         * `use Filament\Forms;` imports a NAMESPACE, not a class, and `class_exists()` says false
         * for every one of them — three files here would be reported as broken on every run. A
         * checker with known false positives is a checker people learn to ignore, and then it
         * cannot do the one job it exists for.
         *
         * Nothing is lost: PHP never errors on an unused import, and an import that IS used shows
         * up through the alias expansion above — which is precisely how `Forms\Get` was caught.
         */

        return array_values(array_unique($resolved));
    }
}
