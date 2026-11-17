# 003 — iPhone preview stops and grid cards have uneven sizes

## What happens
User reports that a grid preview runs only once on iPhone and cards have different heights.

## Expected
A held grid photo keeps alternating until release or scrolling. Grid cards have equal frames,
headers and action areas, even when names wrap or a reference photo is missing.

## Reproduce
On iPhone open the local library, select Grid, hold a photo through at least four switches,
release, scroll and compare adjacent cards with short/long names and missing photos.

## Local correction
Separate the visibility observer from touch state to avoid resetting it on interaction,
preserve touch across focus changes, and tolerate small finger movements. Reserve consistent
header/media/footer space. Real iPhone verification remains required.
