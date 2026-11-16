# PDR 052: The phone's layout in one column for every page on a wide screen

## Status

Active

## Context

The app is used on phones held upright and on wide screens, and everything a user does on a phone they also do on a laptop.

Every page is laid out for a phone: its rows, inputs and buttons run the width of the screen, one beneath another, under a top bar. Today a wide screen shows the same layout stretched, so every row, input and button spans the whole window.

A line that spans a wide window is read by crossing the whole screen, and a value of one word sits in an input as wide as the window. A column as narrow as a phone's screen holds as little across as a phone does, however much room the window has.

A wide screen has room for what a phone cannot hold, such as a table of a deck's cards, rows pasted in or a menu kept open down one side of the window. A layout made for a wide screen is more work than one column.

The app is not yet published, and it is to be published as soon as it can be.

PDR 051 puts Cancel and Create or Save in a bar at the foot of the screen on every form, and the bar stays there while the page scrolls.

PDR 031 says in a banner at the top of every page when the connection is lost, and PDR 053 tells a visitor who is not logged in, in a banner there too, that what they see is an example.

A band across the window reaches the window's edges, however narrow the column that holds its words or buttons.

Some things open over a page: the menu, a sheet that rises from the foot of the screen, a question the app asks before it goes on, and a picture opened from a card. Each dims the page behind it.

On a phone the menu opens from the screen's left edge, beside its button, a sheet is as wide as the page beneath it, and a question stands in the middle of the screen.

Today on a wide screen the menu opens at the window's left edge, away from its button, and a sheet, a question and an opened picture span the window.

A user opens a picture to see it larger.

## Decision

We will show every page on a wide screen in the phone's layout, in one column in the middle of the window, about one and a half times as wide as a phone's screen.

We will hold the top bar, the banners above it and the bar at the foot of a form to the same column, each as wide as the column.

We will open whatever opens over a page inside the same column, as on a phone's screen: the menu from the column's left edge, a sheet from the foot at the column's width, and a question the app asks in the column's middle. The dimming behind each covers the whole window.

We will show a picture opened from a card as large as the window allows, the one thing that opens over a page and is not held to the column.

We will let nothing of the app reach past the column's edges but the dimming behind what opens over a page and a picture opened from a card.

## Alternatives considered

### The phone's layout across the whole window

Rejected because the eye crosses the whole screen to read one row, and a one-word value sits in an input as wide as the window.

### A column as wide as a phone's screen

Rejected because rows stay as cramped as on a phone though the room is there.

### A layout made for a wide screen

Rejected because it takes more work than publishing can wait for.

### The banners and the bar at the foot of a form across the whole window, with their words and buttons in the column

Rejected because the app would then reach the window's edges above and below the column, and read as partly stretched.

### What opens over a page across the whole window

Rejected because a sheet's rows would run the width of the window, and the menu would open far from its button.

### The menu kept open down one side of the window

Rejected because it belongs to a layout made for a wide screen, which waits until the app is published.

### An opened picture held to the column

Rejected because the picture would stay small, with an empty window on either side.

## Consequences

**Positive**

- The user on a laptop meets the layout they know from a phone.
- The user on a wide screen sees nothing stretched across the window, and reads a row without crossing the screen.
- The user finds the buttons at the foot of a form as wide as the form above them.
- The user on a wide screen finds the menu beside its button, and a sheet as wide as the page beneath it.
- The user on a wide screen sees an opened picture as large as the window allows.
- The user on a wide screen sees the app as one column, with nothing of it at the window's edges.

**Negative**

- The user finds a table of a deck's cards and a way to paste rows in on no screen.
- The user on a wide screen opens the menu each time they want it, though the window has room to keep it open.

**Neutral**

- The user who meets the app first on a laptop reads it as a phone's app.
- The user on a wide screen sees the whole window dim around the column when something opens over a page.
- The user on a wide screen reads a banner as a block the column's width, a little more a part of the page than a word about the whole app.
