# ADR 027: Practice card presentation — static two-zone reveal, tap-to-open media

## Status

Deprecated by the record rules' Type test

## Context

A practice card's answer side is a variable-length list of independently-rated fields — pool sampling can draw a different field selection and count on each attempt of the same underlying card, even on its own retries (`generate_practice_card_fields`). Field values may be `text`, `image`, or `audio` (`FieldType`, `app/models/field_def.py`). A literal 3D flip-card interaction and inline media rendering were considered before settling on the design below.

## Decision

We will present a practice card as two zones — a prompt zone, always visible, and an answer zone, hidden until one "Show answer" tap reveals every answer field at once (never per-field). Zones stack vertically in portrait, sit side by side in landscape. Wherever a resolved field's value would render — either zone, and the completion breakdown's detail view — an `image`/`audio` value never renders inline: it shows as a small tappable placeholder chip, and tapping opens the media in an overlay above the page. Any reveal animation may look flip-like, but the underlying model is two zones, not two literal card faces. Video is out of scope — not a supported `FieldType`.

## Alternatives considered

### A structural 3D flip card (front = prompts, flip reveals back = answers)

Rejected — the "back" has to hold a variable-length list of individually-rated fields, not one atomic answer, which doesn't map onto a two-sided object, and a flip has no natural affordance for audio.

### Render images/audio inline in the zone

Rejected — a zone already holds a variable number of fields; letting one field's media dominate makes zone height unpredictable per card. A uniform placeholder keeps every card's layout predictable regardless of what media it holds.

## Consequences

**Positive**

- The developer holds reveal state as one boolean, not per field.
- The user sees predictable zone sizing across cards with different field counts and media.
- The developer serves the run page and the breakdown with one field-rendering rule.

**Negative**

- The user taps once more to see an image or audio value that would have fit inline.
- The developer manages one more floating layer, the media overlay, beside the rating popover.

**Neutral**
