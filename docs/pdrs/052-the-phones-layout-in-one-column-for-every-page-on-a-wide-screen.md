# PDR 052: The phone's layout in one column for every page on a wide screen

## Status

Active

## Context

The app is used on phones held upright and on wide screens, and everything a user does on a phone they also do on a laptop.

Every page is laid out for a phone: its rows, inputs and buttons run the width of the screen, one beneath another, under a top bar. Today a wide screen shows the same layout stretched, so every row, input and button spans the whole window.

A line that spans a wide window is read by crossing the whole screen, and a value of one word sits in an input as wide as the window. A column as narrow as a phone's screen holds as little across as a phone does, however much room the window has.

A wide screen has room for what a phone cannot hold, such as a table of a deck's cards or rows pasted in. A layout made for a wide screen is more work than one column.

The app is not yet published, and it is to be published as soon as it can be.

PDR 051 puts Cancel and Create or Save in a bar at the foot of the screen on every form, and the bar stays there while the page scrolls.

## Decision

We will show every page on a wide screen in the phone's layout, in one column in the middle of the window, about one and a half times as wide as a phone's screen.

We will hold what the top bar contains, and the buttons of the bar at the foot of a form, to the same column.

## Alternatives considered

### The phone's layout across the whole window

Rejected because the eye crosses the whole screen to read one row, and a one-word value sits in an input as wide as the window.

### A column as wide as a phone's screen

Rejected because rows stay as cramped as on a phone though the room is there.

### A layout made for a wide screen

Rejected because it takes more work than publishing can wait for.

## Consequences

**Positive**

- The user on a laptop meets the layout they know from a phone.
- The user on a wide screen sees nothing stretched across the window, and reads a row without crossing the screen.
- The user finds the buttons at the foot of a form as wide as the form above them.

**Negative**

- The user finds a table of a deck's cards and a way to paste rows in on no screen.

**Neutral**

- The user who meets the app first on a laptop reads it as a phone's app.
