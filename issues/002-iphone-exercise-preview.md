# 002 — Exercise card hold does not preview on iPhone

## What happens
The user reports that holding a finger on a card in the local exercise library does not start
its movement preview. Desktop focus preview works; the original card used pointer events and
allowed native image dragging/callouts, so the iPhone path needs a real-device check.

## What should happen
After a one-second deliberate touch-and-hold, alternate the actual start/end photos. Release
stops it without opening details. Short taps open details; moving a finger scrolls normally.

## Reproduce
On an iPhone connected to the demo's Wi-Fi, open Exercises, choose Cards or Grid, hold a photo
still for one second, then release. Also try a short tap and vertical scrolling.

## Local change
Native touch start/move/end/cancel handlers, non-draggable pointer-transparent photos,
selection/callout suppression and a 10 px movement threshold. Real-iPhone confirmation pending.

## Superseding decision
User replaced holding with automatic in-view previews. All touch/hold-specific behaviour is
removed; real-phone verification now covers automatic start/stop during scrolling.
