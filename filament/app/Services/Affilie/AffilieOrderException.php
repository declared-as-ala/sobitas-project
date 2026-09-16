<?php

namespace App\Services\Affilie;

/**
 * A validation/business failure while an affiliate creates an order.
 *
 * It carries a SEMANTIC field (not a Filament form path and not an API key) plus the original line
 * key when the failure is line-specific, so each caller can render it its own way:
 *   • the Filament page maps `field` → its form statePath and shows the message under the input;
 *   • the API controller maps `field` → a JSON validation error (422).
 *
 * The message is the final, user-facing French sentence — never rewritten by the caller.
 */
class AffilieOrderException extends \RuntimeException
{
    /**
     * @param string     $field   one of: account, phone, lines, product, price, stock
     * @param string     $message user-facing French message
     * @param int|string|null $lineKey original key of the offending line (for product/price/stock)
     */
    public function __construct(
        public readonly string $field,
        string $message,
        public readonly int|string|null $lineKey = null,
    ) {
        parent::__construct($message);
    }
}
