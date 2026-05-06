# Loyalty Manual Acceptance Checklist

## Test 1 - Scanner page detects card
- Open `Scanner fidélité` in admin sidebar.
- Scan `SOBITAS-000001`.
- Expected: card panel appears immediately with status badge.

## Test 2 - Assign unassigned card
- Scan an unassigned card.
- Select existing client and click assign.
- Expected: card becomes active and linked to client.

## Test 3 - POS loyalty panel auto-load
- Open POS page.
- Select a client with active loyalty card.
- Expected: `Programme Fidélité` panel appears without page refresh.

## Test 4 - POS barcode field loyalty detection
- Scan a loyalty card in barcode input.
- Expected: client auto-selected and loyalty panel populated; no product line added.

## Test 5 - Max redemption math
- Client balance: `219` points.
- Ticket total: `95.000`.
- Click `Max`.
- Expected:
  - Remise fidélité: `-21.900`
  - Net à payer: `73.100`
  - Points à gagner: `73`

## Test 6 - Save idempotency
- Save ticket once with loyalty redemption.
- Save/edit same ticket again.
- Expected: no duplicate loyalty transactions; client balance updated exactly once.

## Test 7 - Ticket print loyalty section
- Print the saved ticket.
- Expected:
  - Card number
  - Old balance
  - Points used
  - Loyalty discount
  - Points earned
  - New balance

## Test 8 - Generate cards and export PDF
- Generate a batch of 100 cards.
- Export PDF in front/back mode.
- Expected: professional card design rendered for print.

## Test 9 - Batch export and CSV
- Export batch PDF (front-only, back-only, both) and CSV.
- Expected: files downloadable and usable for printer workflow.

## Test 10 - Batch print status lifecycle
- Mark batch as printed then delivered.
- Expected: `print_status`, `printed_at`, and `delivered_to_store_at` are updated.
