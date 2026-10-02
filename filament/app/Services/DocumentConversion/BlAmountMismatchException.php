<?php

namespace App\Services\DocumentConversion;

/**
 * A delivery note would make the courier collect something else than the prix_ttc the customer was
 * told at checkout (Protinas v3, spec F0). Thrown inside the conversion transaction, so nothing is
 * written and nothing is sent to Aramex. The message is French and meant for staff.
 */
class BlAmountMismatchException extends \DomainException
{
}
