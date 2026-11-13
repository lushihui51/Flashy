# PDR 025: A card opened from the summary as its fields, with a mark for each attempt

## Status

Superseded by PDR 043

## Context

PDR 024 lists each card once on a practice's summary, with its mastery after the practice and its change as one of five kinds, and nothing about its attempts.

PDR 021 gives each field of a card its own mastery, built from the ratings given that field, and takes the card's mastery across every field of its deck. Why a card's mastery moved is found in its fields.

PDR 009 has the user practice a card as a prompt and a list of answers, rating each answer Again, Hard, Good or Easy. A card can have several answer fields, so the same ratings repeat across a card's fields and attempts.

PDR 008 lets random draw change which fields a card shows or asks from one attempt to the next, so a field can be shown or asked in some attempts and not others. A field that a practice never showed or asked did not move.

A card rated Again on a field returns later in the same practice, so a card can have many attempts. Answers can be long.

PDR 015 makes red what went wrong or was a struggle, ink what is done, and line grey what has not happened.

A mark the user has not met before needs explaining, and an explanation always on screen takes room from what it explains.

Today a card's detail lists every attempt, each marked passed or failed with its fields and each answer's rating, followed by every field of the card's deck with its mastery and change.

## Decision

We will open a card's row on the summary into a sheet that shows the card's mastery and change, then each field the practice showed or asked in any attempt, once, under the prompt side or the answer side. Each field shows its value, its own mastery and change, and one mark per attempt, in order.

A prompt field's mark says whether that attempt showed it. An answer field's mark says how that attempt rated it, or that it did not ask it. Each rating has a mark of its own, and the marks for Again, Hard, Good and Easy change step by step in that order, so the user tells the ratings apart at a glance.

We will name every mark in a key the user opens from the sheet.

Nothing on the sheet says how many attempts the card took, or which passed or failed.

## Alternatives considered

### Every attempt listed in full

Rejected because it grows with every retry.

### Every field of the deck

Rejected because a field the practice never showed or asked did not move.

### Only the fields the practice asked as answers

Rejected because a prompt field that was shown moved too.

### A list of the fields apart from what happened in each attempt

Rejected because it shows each field twice and parts its marks from its mastery.

### The fields without their own mastery

Rejected because the sheet would no longer show why the card's mastery moved.

### A count of each rating

Rejected because it loses which attempt each rating came from.

### No mark for an attempt that did not show or ask a field

Rejected because a field's marks would no longer line up with the attempts.

### A key always shown on the sheet

Rejected because it crowds the sheet.

## Consequences

**Positive**

- The user sees why a card's mastery moved, field by field, beside what happened to each field in each attempt.
- The user reads a card retried many times as one row of marks per field.
- The user tells the ratings apart at a glance, Hard, Good and Easy included.

**Negative**

- The user learns the marks from the key before they read them at once.
- The user who wants to know how many attempts a card took counts the marks.

**Neutral**

- The user does not see the fields the practice never showed or asked.
