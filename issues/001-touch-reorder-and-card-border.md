# Issue 001 — Touch reordering cancels too easily; controls have a separate border

## What happens

On a phone, sliding the reorder grip before its 300 ms hold delay cancels the
gesture. The card also stays in its original position while only an insertion
marker changes. The reorder toolbar and exercise body have separate borders.

## What should happen

Holding or deliberately sliding the grip picks up the card. The card follows the
finger vertically; dropping commits the new order. The controls belong inside
one exercise card, with no separate bordered strip. Other parts of the card
remain available for normal page scrolling and input.

## Reproduce

1. On a phone, create or edit a workout with two or more exercises.
2. Start sliding a grip without waiting 300 ms.
3. Notice that no reorder happens; inspect the doubled card border.

## Verification

The early-movement cancellation was removed, the drag now animates the whole
card, and one shared card border contains both controls and fields. Browser
mouse drag and the 375 × 667 layout were checked. Real-phone touch confirmation
is still pending from the reporter.
