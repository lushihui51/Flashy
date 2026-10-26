# PDR 008: A tap-to-move board for a configuration's fields

## Status

Active

## Context

A configuration gives each field of a deck one of five roles: left out, shown on every card's prompt side, drawn at random for the prompt side, shown on every card's answer side, or drawn at random for the answer side. Each side that draws at random has a count of how many fields a card draws.

The app is used on phones as well as desktops.

The first board moved fields by dragging. It could not be used on a phone, and barely with a mouse.

A drag moves a field in one gesture and needs a pointer and room to drag across. A tap followed by a choice takes two taps and works with a finger, a mouse, a keyboard or a screen reader.

A layout that differs by screen size fits each screen; one layout on every screen is one thing to learn.

## Decision

We will lay a deck's fields out on a board of five areas, in one layout on every screen size: the fields left out at the top, then the prompt side and the answer side, each holding an area for the fields every card shows and an area for the fields drawn at random. Each side's draw count sits directly beneath the random-draw area it governs. A field sits in exactly one area.

We will move a field by tap alone: tapping a field opens a sheet listing the four other areas, and tapping one moves the field there. Nothing is dragged, on any screen.

## Alternatives considered

### Dragging fields between areas, with a dropdown inside each field as the fallback

Rejected because it was unusable on a phone and did not fit a narrow screen.

### Tapping a field and then tapping its destination, with no sheet

Rejected because the user must hold a chosen field in mind and learn how to cancel.

### Five flat sections stacked

Rejected because the draw count sits at the bottom, away from the fields it counts.

### A row per field with badges

Rejected because the configuration can only be read row by row.

### A sheet on phones and a different picker on wide screens

Rejected because it is two pickers to learn.

## Consequences

**Positive**

- The user moves any field with the same two taps on a phone, a desktop, a keyboard or a screen reader.
- The user reads the configuration from the board's shape: two sides, always shown or drawn, counts beside what they count.

**Negative**

- The user pays two taps for a move where a drag would be one.

**Neutral**

- The user on a desktop sees the sheet rise from the bottom, as on a phone.
