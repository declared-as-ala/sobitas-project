<?php

namespace App\Support\Aramex;

/**
 * ── ARAMEX'S OWN VOCABULARY, WRITTEN DOWN ───────────────────────────────────────────────────
 * Aramex returns an `UpdateCode` like `SH005` and a free-text `UpdateDescription`. Until this
 * file existed, this codebase knew exactly ONE of those codes — `SH006`, inherited from a
 * dashboard widget — and treated it as the meaning of "delivered". That single unverified
 * constant is the whole reason 1,082 orders sat undelivered, no loyalty point was ever awarded,
 * and the review-request engine never sent one email.
 *
 * The correction is not subtle:
 *
 *     SH005  Delivered                 <- the actual delivery event. NEVER CONFIGURED.
 *     SH006  Collected by Consignee    <- the customer came to an Aramex counter. Configured.
 *
 * `SH006` is a real receipt, so it was not wrong to keep — it was wrong to be the only one. A
 * home-delivery shop whose delivery detection recognises only counter pickups will, correctly and
 * silently, detect almost nothing. That is precisely what the live account showed.
 *
 * ── PROVENANCE, BECAUSE IT MATTERS HERE ─────────────────────────────────────────────────────
 * Aramex's official tracking-API manual is published as a PDF that returns HTTP 403 to any
 * non-browser client, so this table is transcribed from the open-source Aramex SDK at
 * github.com/DigitalCloud/aramex (resources/lang/en/en.php), which ships it as its status
 * translation map.
 *
 * That is a secondary source, and it is treated as one:
 *
 *   - It CORROBORATES against our own account. `SH014 => 'Record created.'` here matches, to the
 *     full stop, the description the live account returned on 21/08/2026.
 *   - It is INCOMPLETE. The live account also returns `SH239 "Shipment charges paid"`, which is
 *     absent from this table entirely. So `describe()` prefers whatever Aramex actually said, and
 *     an unknown code is never silently treated as meaningless.
 *   - It is NOT the authority for what promotes an order. `config('aramex.delivered_codes')` is.
 *     This table decides what gets DESCRIBED and what gets QUESTIONED.
 */
final class AramexStatusCodes
{
    /**
     * Codes that mean the consignee physically has the goods.
     *
     * Each of these is a completed handover to the person who ordered — by courier, to a letter
     * box, from a locker, from a drop-off point, or over an Aramex counter. This is the default
     * for `delivered_codes`.
     */
    public const DELIVERED = [
        'SH005', // Delivered
        'SH006', // Collected by Consignee
        'SH234', // Shipment is Delivered in Letter Box
        'SH496', // Shipment Picked up by Consignee
        'SH534', // Shipment Picked up from the Drop-off location
    ];

    /**
     * Real receipts that are deliberately NOT auto-promoted, and why.
     *
     * Promoting on any of these would award points and ask for a review on an order the customer
     * may not fully have. They are listed rather than omitted so that a human reading this table
     * can see they were considered and rejected, instead of assuming they were forgotten.
     *
     *   SH154  Delivered - Partial Delivery          part of a multi-piece shipment, not the order
     *   SH007  Will be Delivered by Postal Services  handed to a third party; unverifiable by us
     *   SH236  Document delivered.                   paperwork, not goods
     *   SH408  Document delivered.                   idem
     *   SH034  Documents Delivered to Consignee/Broker for Self Clearance & Delivery
     *
     * Any of these can be switched on per-account via ARAMEX_DELIVERED_CODES without a deploy.
     */
    public const DELIVERED_AMBIGUOUS = ['SH154', 'SH007', 'SH236', 'SH408', 'SH034'];

    /**
     * Codes after which Aramex will never move the shipment again, so polling it is wasted spend.
     * Returns and confiscations are terminal without ever having been a delivery.
     */
    public const TERMINAL = ['SH069', 'SH407', 'SH559', 'SH280', 'SH247'];

    /** @var array<string,string> */
    public const DESCRIPTIONS = [
        'SH001' => 'Under processing at operations facility',
        'SH003' => 'Out for Delivery',
        'SH004' => 'Out for Delivery - Partial',
        'SH005' => 'Delivered',
        'SH006' => 'Collected by Consignee',
        'SH007' => 'Will be Delivered by Postal Services',
        'SH008' => 'Shipment on Hold',
        'SH012' => 'Picked Up From Shipper',
        'SH014' => 'Record created.',
        'SH022' => 'Departed Operations facility - In Transit',
        'SH033' => 'Attempted Delivery - Consignee Rejected the Shipment Due to Delay / Awaiting Shipper Instructions',
        'SH034' => 'Documents Delivered to Consignee/Broker for Self Clearance & Delivery',
        'SH035' => 'Awaiting Clearance from Consignee/Broker to Arrange Delivery',
        'SH041' => 'Cleared from Customs',
        'SH043' => 'Invalid Identity proof document',
        'SH044' => 'Delay - Delivery Rescheduled',
        'SH047' => 'Received at Origin Facility',
        'SH069' => 'Returned to Shipper',
        'SH070' => 'Redirected to New Delivery Address',
        'SH071' => 'Please Contact Local Office to Verify Your Shipment Status',
        'SH073' => 'Shipment Forwarded to Beyond/Remote Area Sorting Location',
        'SH074' => 'Delay - Pending Payment',
        'SH076' => 'Delay - Delivery Rescheduled',
        'SH077' => 'Forwarded to Aramex office',
        'SH110' => 'Forwarded to Delivery Office',
        'SH154' => 'Delivered - Partial Delivery',
        'SH156' => 'Held - Pending KYC Document',
        'SH157' => 'Delay - Unable to Deliver',
        'SH158' => 'Held in Customs - Pending Clearance',
        'SH160' => 'Under processing at operations facility',
        'SH162' => 'Delay - Uncontrollable Due to Carrier',
        'SH163' => 'On Hold - Pending Customs Value Confirmation',
        'SH164' => 'Held for Consignee Pickup',
        'SH203' => 'Record Created',
        'SH222' => 'Arrived at Destination and Documents Recovered',
        'SH228' => 'Shipment Consol Update',
        'SH230' => 'Consignee/Broker Notified of Shipment Arrival',
        'SH234' => 'Shipment is Delivered in Letter Box',
        'SH236' => 'Document delivered.',
        'SH237' => 'Please Contact Local Office to Verify Your Shipment Status',
        'SH247' => 'Supporting Document Returned to Shipper',
        'SH249' => 'SMS Sent to Consignee to Contact Aramex and Set Delivery Address',
        'SH250' => 'Shipper Contacted',
        'SH251' => 'Third Party Customer Contacted',
        'SH252' => 'Shipment Forwarded to Beyond/Remote Area Sorting Location',
        'SH257' => 'Unable to Notify Consignee/Broker',
        'SH259' => 'Entry into Warehouse',
        'SH260' => 'Exit from Warehouse',
        'SH261' => 'Consignee contacted to set delivery',
        'SH270' => 'Email Sent to Consignee',
        'SH271' => 'SMS Sent to Consignee',
        'SH272' => 'Forwarded to Final Destination',
        'SH273' => 'Delivery Scheduled',
        'SH275' => 'On Hold - Operations Facility',
        'SH278' => 'Data received.',
        'SH279' => 'Shop&Ship Update',
        'SH280' => 'Confiscated by Customs Authorities',
        'SH281' => "Customs' Documents Out for Delivery",
        'SH294' => 'On Hold - Customer Mobile Cannot be Reached',
        'SH295' => 'Delivery Address Corrected',
        'SH296' => 'Delivery Address Corrected',
        'SH299' => 'Shipment Not Received from Shipper',
        'SH308' => 'Pickup Scheduled',
        'SH312' => 'Pickup Re-Scheduled',
        'SH313' => 'Pickup Cancelled',
        'SH314' => 'Pickup Completed',
        'SH369' => 'SMS Sent to Consignee',
        'SH375' => 'On Hold - Awaiting Correct Delivery Address',
        'SH376' => 'Delay - Delivery Rescheduled for Next Business Day',
        'SH381' => 'Shipment On-Hold',
        'SH382' => 'Shipment Update',
        'SH383' => 'Credit Card Payment - Completed',
        'SH406' => 'Received at Origin Facility',
        'SH407' => 'Returned to Shipper',
        'SH408' => 'Document delivered.',
        'SH410' => 'Customer contact Attempts Completed',
        'SH434' => 'Received at Origin Facility',
        'SH462' => 'Held by Customs',
        'SH464' => 'Customs Cleared',
        'SH466' => 'Shipment under customs clearance process',
        'SH467' => 'Held in Customs - Awaiting Customer Instructions',
        'SH468' => 'Held in Customs - Awaiting Commercial Invoice/Clearance Documents',
        'SH469' => 'Customs Clearance - In Progress',
        'SH470' => 'Held in Customs - Awaiting Duty and Tax Payment',
        'SH471' => 'Held in Customs - Misdeclaration by Shipper / Urgent Customer Instructions Required',
        'SH472' => 'Held in Customs - Unacceptable Commodities',
        'SH473' => 'Held in Customs - Requires Governmental Approvals',
        'SH474' => 'To be Returned to Shipper',
        'SH475' => 'Forwarded to Aramex office',
        'SH479' => 'Unable to Notify Consignee/Broker',
        'SH480' => 'On Hold - Payment not Ready / Delivery Rescheduled',
        'SH484' => 'Shipment Delivery Method Set as Aramex Locker',
        'SH491' => 'SMS Reminder Sent to Pick up Shipment from Aramex Locker',
        'SH492' => 'Consignee Pickup Time Exceeded - Shipment is no Longer Available at Aramex Locker',
        'SH493' => 'Delivery Method Changed - Shipment will be Moved from Aramex Locker',
        'SH494' => 'Shipment Picked up by Aramex Courier from Locker',
        'SH495' => 'Shipment Scanned at Operations Facility',
        'SH496' => 'Shipment Picked up by Consignee',
        'SH498' => 'Customer Contact Attempts Completed - Pending Return to Shipper',
        'SH499' => 'Shipment Held at Aramex Locker for Consignee Pick up',
        'SH504' => 'Delivery Method Changed - Shipment is Oversize',
        'SH505' => 'Auto-Payment Cancelled',
        'SH513' => 'Shipment Delivery Auto-scheduled',
        'SH515' => 'Courier Called Customer - Number Unreachable',
        'SH516' => 'Customer Called Courier - Responded',
        'SH521' => 'Upon Consignee Request At Local Office - Shipment To Be Scheduled For Delivery',
        'SH529' => 'Shipment Delivery Method Set as Drop-off',
        'SH530' => 'SMS Reminder Sent to Pick up Shipment from the Drop-off location',
        'SH531' => 'Consignee Pickup Time Exceeded - Shipment is no Longer Available at the Drop-off location',
        'SH532' => 'Shipment dropped off by the courier at the drop off location as per customer request',
        'SH533' => 'Shipment Held at the Drop off location for Consignee Pick up',
        'SH534' => 'Shipment Picked up from the Drop-off location',
        'SH537' => 'Shipment Delivery Method Set as Park and Parcel',
        'SH538' => 'Delivery Review - Please contact Local Office for Shipment Status',
        'SH539' => 'Delivery Review - Please contact Local Office for Shipment Status',
        'SH556' => 'Customer Contacted Successfully',
        'SH559' => 'Shipment Returned to Shipper',
        'SH560' => 'Awaiting Customer Collection-Will Be Returned In 2 Days',
    ];

    /**
     * What this code means, preferring what Aramex actually said over the transcription.
     *
     * The table is a secondary source and is demonstrably incomplete — SH239 is missing from it
     * entirely — so the live description always wins when there is one. The table is what fills
     * the gap when a stored code is being rendered with no response beside it.
     */
    public static function describe(string $code, ?string $live = null): ?string
    {
        if ($live !== null && trim($live) !== '') {
            return trim($live);
        }

        return self::DESCRIPTIONS[strtoupper(trim($code))] ?? null;
    }

    /** Does Aramex's own table say this code means the consignee has the goods? */
    public static function isDeliveryClass(string $code): bool
    {
        return in_array(strtoupper(trim($code)), self::DELIVERED, true);
    }

    /** A receipt of some kind, including the ones we refuse to auto-promote on. */
    public static function isReceiptClass(string $code): bool
    {
        $code = strtoupper(trim($code));

        return in_array($code, self::DELIVERED, true)
            || in_array($code, self::DELIVERED_AMBIGUOUS, true);
    }

    /** Aramex will never move this shipment again. */
    public static function isTerminal(string $code): bool
    {
        return in_array(strtoupper(trim($code)), self::TERMINAL, true);
    }
}
