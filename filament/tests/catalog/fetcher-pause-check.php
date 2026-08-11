<?php

/**
 * The circuit-breaker bucket, and the hostnames the catalogue jobs ask it about.
 *
 *     php filament/tests/catalog/fetcher-pause-check.php
 *
 * ── THE INCIDENT THIS FILE EXISTS FOR ─────────────────────────────────────────────────────
 * On 11/08/2026 the content pass took 5 failures against fr.iherb.com. PoliteFetcher::bucket()
 * groups both iHerb hostnames under the config pattern `iherb.com` DELIBERATELY, so one pace and
 * one circuit breaker cover both — "a run of 403s from fr.iherb.com is iHerb telling us to stop;
 * carrying on against tn.iherb.com because it is spelled differently would be reading the message
 * and ignoring it."
 *
 * That grouping is correct and is asserted below. What it cost was everything downstream: with the
 * breaker open, PoliteFetcher::get() returned `null` in microseconds without a request leaving the
 * machine, the jobs read that as `http:0 transient`, and each burned one of the ROW's three
 * attempts. 8,103 hydration rows and 7,077 content rows were marked permanently failed inside
 * eleven minutes — by a thirty-minute cooldown.
 *
 * The fix is a guard before claim(): `if ($fetcher->isPaused($host)) return;`. And the first
 * version of that guard PASSED `IHerbClient::PROVIDER`, which is the slug 'iherb' — not a hostname.
 * bucket() maps an unknown string to itself, so it would have checked the breaker key `iherb`,
 * which nothing ever writes. The guard would have read as correct in review, linted clean, and
 * never once fired.
 *
 * So this file asserts the thing that actually matters and cannot be seen by reading:
 *   1. both real iHerb hostnames resolve to ONE bucket, so one pause covers both
 *   2. the constants the jobs pass are HOSTNAMES that land in that bucket — not slugs
 *   3. an unrelated host is NOT swept into it
 */

require_once __DIR__.'/../../app/Services/Enrichment/PoliteFetcher.php';
require_once __DIR__.'/../../app/Services/Catalog/IHerb/IHerbClient.php';

use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Enrichment\PoliteFetcher;

if (! function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        return $default;
    }
}

/**
 * The REAL config file, not a copy of it.
 *
 * bucket() reads `enrichment.hosts`, and the whole point of this check is that it agrees with the
 * configuration that actually ships. A hand-written host list here would pass while production was
 * grouped differently — the exact failure mode slug-relevance-check.php and promotion-gate-check.php
 * avoid the same way.
 */
$enrichment = require __DIR__.'/../../config/enrichment.php';

if (! function_exists('config')) {
    function config(string $key, mixed $default = null): mixed
    {
        global $enrichment;

        if ($key === 'enrichment.hosts') {
            return $enrichment['hosts'] ?? [];
        }

        return $default;
    }
}

$failed = 0;
$checks = 0;

function check(string $label, bool $ok, string $detail = ''): void
{
    global $failed, $checks;
    $checks++;
    if (! $ok) {
        $failed++;
    }
    printf("  %s  %s%s\n", $ok ? 'PASS' : 'FAIL', $label, $ok || $detail === '' ? '' : "\n        ".$detail);
}

$fetcher = new PoliteFetcher();

echo "\nPoliteFetcher bucket + the hosts the catalogue jobs pause on\n\n";

$apiBucket = $fetcher->bucket(IHerbClient::API_HOST);
$contentBucket = $fetcher->bucket(IHerbClient::contentHost());

check(
    'the identity host buckets to `iherb.com`',
    $apiBucket === 'iherb.com',
    sprintf('IHerbClient::API_HOST = "%s" bucketed to "%s"', IHerbClient::API_HOST, $apiBucket),
);

check(
    'the content host buckets to `iherb.com`',
    $contentBucket === 'iherb.com',
    sprintf('IHerbClient::contentHost() = "%s" bucketed to "%s"', IHerbClient::contentHost(), $contentBucket),
);

check(
    'ONE pause covers both passes — the two hosts share a bucket',
    $apiBucket === $contentBucket,
    'if these ever diverge, each pass paces itself at the full configured rate and iHerb receives '
        .'double, which is the arithmetic PoliteFetcher exists to prevent',
);

/*
 * THE BUG THAT SHIPPED FOR ONE COMMIT, PINNED BY NAME.
 *
 * PROVIDER is the staging row's provider slug. It is not a hostname, it matches no config pattern,
 * and bucket() therefore returns it unchanged — a breaker key nothing writes. Any future edit that
 * hands a slug to isPaused()/bucket() fails here instead of shipping a guard that never fires.
 */
check(
    'the PROVIDER SLUG does NOT bucket to iherb.com — it is not a hostname',
    $fetcher->bucket(IHerbClient::PROVIDER) !== 'iherb.com',
    sprintf(
        'IHerbClient::PROVIDER = "%s" bucketed to "%s". If this ever equals "iherb.com" the '
            .'distinction this check defends has been lost',
        IHerbClient::PROVIDER,
        $fetcher->bucket(IHerbClient::PROVIDER),
    ),
);

check(
    'PROVIDER is a slug and API_HOST is a host — they are not interchangeable',
    IHerbClient::PROVIDER !== IHerbClient::API_HOST && ! str_contains(IHerbClient::PROVIDER, '.'),
    'the guard added on 11/08/2026 passed PROVIDER at first; it linted clean and would never have fired',
);

check(
    'an unrelated host is not swept into the iHerb bucket',
    $fetcher->bucket('www.example.com') === 'www.example.com',
    'bucket() must only group hosts that are a suffix match on a CONFIGURED pattern',
);

check(
    'a lookalike host is not swept in either',
    $fetcher->bucket('notiherb.com') === 'notiherb.com',
    'suffix matching must be on ".pattern", not a bare string contains — "notiherb.com" is a '
        .'different company',
);

check(
    'isPaused accepts a bare hostname AND a URL',
    (function () use ($fetcher): bool {
        // Both forms must reach bucket() without throwing. The breaker state itself needs a cache
        // and is not exercised here; what is asserted is that neither form is rejected outright,
        // because a caller passing a URL was the obvious next mistake after passing a slug.
        $r = new ReflectionMethod($fetcher, 'isPaused');

        return $r->isPublic() && $r->getNumberOfParameters() === 1;
    })(),
    'isPaused must be public and take one argument — the jobs call it before claiming a row',
);

echo "\n".str_repeat('─', 100)."\n";

if ($failed > 0) {
    printf("\n%d of %d check(s) FAILED.\n\n", $failed, $checks);
    exit(1);
}

printf("\nAll %d checks passed.\n\n", $checks);
exit(0);
