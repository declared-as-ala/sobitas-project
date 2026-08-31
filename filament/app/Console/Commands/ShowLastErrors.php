<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * ── "SERVER ERROR 500", WITH NOTHING TO GO ON ───────────────────────────────────────────────
 * Owner, 20/08/2026: *"when I try to go to /products/create I get server error 500, fix it, and
 * fix any possible future bugs like it."*
 *
 * The second half of that is the harder and more useful half, and it is not really about code.
 * `APP_DEBUG` is false on this install — correctly, because a debug page on a public admin host
 * leaks the database name, every environment variable and the full source of the failing file. So
 * the browser shows a grey "Server Error" and the actual exception goes only to
 * storage/logs/laravel.log, which is a 100 MB file of stack traces that nobody is going to page
 * through over SSH.
 *
 * That is why a 500 here is currently un-actionable: not because the information is missing, but
 * because it is unreachable in practice. This makes it one command:
 *
 *     php artisan errors:last                # the last 3 exceptions, most recent first
 *     php artisan errors:last --count=10
 *     php artisan errors:last --grep=products/create
 *     php artisan errors:last --full         # include the full stack trace
 *
 * Run it right after reproducing the error and the top entry is the cause, with its class, its
 * message, the file and line, and the URL that triggered it.
 */
class ShowLastErrors extends Command
{
    protected $signature = 'errors:last
                            {--count=3 : How many exceptions to show}
                            {--grep= : Only entries containing this text (a URL, a class, a column name)}
                            {--full : Print the whole stack trace instead of the first frames}
                            {--file= : Read a specific log file instead of the newest}';

    protected $description = 'Show the most recent exceptions from the Laravel log, newest first';

    public function handle(): int
    {
        $path = $this->option('file') ?: $this->newestLog();

        if (! $path || ! is_readable($path)) {
            $this->error('No readable log file found in ' . storage_path('logs') . '.');

            return self::FAILURE;
        }

        $this->line('<fg=gray>' . $path . ' — ' . $this->humanBytes((int) filesize($path)) . '</>');
        $this->newLine();

        $entries = $this->readEntries($path);

        if ($grep = (string) $this->option('grep')) {
            $entries = array_values(array_filter(
                $entries,
                static fn (string $e): bool => stripos($e, $grep) !== false
            ));
        }

        if ($entries === []) {
            $this->info('No exceptions found' . ($this->option('grep') ? ' matching that filter.' : '.'));

            return self::SUCCESS;
        }

        $count = max(1, (int) $this->option('count'));
        foreach (array_slice($entries, 0, $count) as $i => $entry) {
            $this->renderEntry($i + 1, $entry);
        }

        $this->newLine();
        $this->line('<fg=gray>Copy the block above when reporting a bug — the first two lines are usually the whole answer.</>');

        return self::SUCCESS;
    }

    /** Newest *.log in storage/logs, by mtime. Daily channels produce laravel-YYYY-MM-DD.log. */
    private function newestLog(): ?string
    {
        $files = glob(storage_path('logs') . DIRECTORY_SEPARATOR . '*.log') ?: [];
        if ($files === []) {
            return null;
        }

        usort($files, static fn (string $a, string $b): int => filemtime($b) <=> filemtime($a));

        return $files[0];
    }

    /**
     * Exception entries, newest first.
     *
     * ── READ FROM THE END, NOT THE START ────────────────────────────────────────────────────
     * The interesting line is always the last one and the file is routinely hundreds of megabytes,
     * so this reads a bounded tail (2 MB) rather than the whole file. `file()` on a 400 MB log is
     * how a diagnostic command becomes the thing that OOMs the container it was meant to debug.
     *
     * A Laravel log entry starts with `[YYYY-MM-DD HH:MM:SS]` at column 0 and continues until the
     * next such line, so the stack trace stays attached to the message it belongs to.
     *
     * @return array<int, string>
     */
    private function readEntries(string $path): array
    {
        $tailBytes = 2 * 1024 * 1024;
        $size = (int) filesize($path);
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return [];
        }
        if ($size > $tailBytes) {
            fseek($handle, -$tailBytes, SEEK_END);
            fgets($handle); // discard the partial line the seek landed in the middle of
        }
        $tail = stream_get_contents($handle) ?: '';
        fclose($handle);

        $parts = preg_split('/\n(?=\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\])/', $tail) ?: [];

        $entries = [];
        foreach ($parts as $part) {
            // Only entries that carry an exception. INFO/DEBUG lines are noise here.
            if (preg_match('/\b(ERROR|CRITICAL|ALERT|EMERGENCY)\b/', $part) === 1 || str_contains($part, 'Stack trace:')) {
                $entries[] = trim($part);
            }
        }

        return array_reverse($entries);
    }

    private function renderEntry(int $n, string $entry): void
    {
        $lines = preg_split('/\r?\n/', $entry) ?: [];
        $head = $lines[0] ?? '';

        // [2026-08-20 12:31:02] production.ERROR: Undefined array key "q" in /app/... :362
        preg_match('/^\[(?<time>[^\]]+)\]\s+\S+\.(?<level>\w+):\s*(?<message>.*)$/', $head, $m);

        $this->line("<fg=yellow;options=bold>#{$n}  " . ($m['time'] ?? '?') . '  ' . ($m['level'] ?? 'ERROR') . '</>');

        $message = $m['message'] ?? $head;
        // The message often ends with ` in /path/file.php:123` plus a JSON context blob; split them
        // so the two things a reader actually needs are on their own lines.
        if (preg_match('/^(?<msg>.*?) in (?<file>[^ ]+\.php):(?<line>\d+)/s', $message, $mm) === 1) {
            $this->line('    <options=bold>' . trim($mm['msg']) . '</>');
            $this->line('    <fg=cyan>' . $mm['file'] . ':' . $mm['line'] . '</>');
        } else {
            $this->line('    <options=bold>' . trim($message) . '</>');
        }

        // The request URL, when the log context carries it.
        if (preg_match('/"url":"([^"]+)"/', $entry, $u) === 1) {
            $this->line('    <fg=gray>url: ' . $u[1] . '</>');
        }

        $trace = array_values(array_filter($lines, static fn (string $l): bool => str_starts_with(trim($l), '#')));
        if ($trace !== []) {
            // The first frames inside our own app are what identify the bug; vendor frames rarely
            // are. Shown first, then the rest only with --full.
            $ours = array_values(array_filter($trace, static fn (string $l): bool => str_contains($l, '/app/') && ! str_contains($l, '/vendor/')));
            $show = $this->option('full') ? $trace : array_slice($ours !== [] ? $ours : $trace, 0, 4);
            $this->newLine();
            foreach ($show as $frame) {
                $this->line('      <fg=gray>' . trim($frame) . '</>');
            }
            if (! $this->option('full') && count($trace) > count($show)) {
                $this->line('      <fg=gray>… ' . (count($trace) - count($show)) . ' more frames (--full)</>');
            }
        }

        $this->newLine();
    }

    private function humanBytes(int $bytes): string
    {
        $units = ['B', 'kB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 1) . ' ' . $units[$i];
    }
}
